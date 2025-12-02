import React, { useEffect, useRef, useCallback, useState } from "react";
import { ImageItem, ErrorItem, RenderMetrics } from "@/types";
import { Button, Tooltip, Popover, Select, Space } from "antd";
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  UndoOutlined,
  DragOutlined,
  SelectOutlined,
  PlusSquareOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { v4 as uuidv4 } from "uuid";

// Danh sách class mẫu (Bạn có thể move ra constant file hoặc nhận từ props)
const CLASSES = [
  { id: "cach_dien_polyme", label: "Cách điện polyme", color: "#00FF66" },
  { id: "cach_dien_thuy_tinh", label: "Cách điện thủy tinh", color: "#00CCFF" },
  { id: "chong_set_van", label: "Chống sét van", color: "#3366FF" },
  { id: "day_dan", label: "Dây dẫn", color: "#6600FF" },
  { id: "ta_chong_rung", label: "Tạ chống rung", color: "#0099FF" },
  {
    id: "tt_ban_phong_dien",
    label: "Cách điện thuỷ tinh bẩn phóng điện",
    color: "#9900CC",
  },
  {
    id: "tt_vo_mat_bat",
    label: "Cách điện thuỷ tinh vỡ mất bát",
    color: "#FF6600",
  },
  { id: "van_ban", label: "Chống sét van bị bẩn", color: "#FF9900" },
  {
    id: "day_ban_phong_dien",
    label: "Dây dẫn bị bẩn, phóng điện",
    color: "#FF6699",
  },
  {
    id: "van_phong_dien_bien_dang",
    label: "Chống sét van bị phóng điện, biến dạng",
    color: "#CC0066",
  },
  { id: "day_tua_dut_soi", label: "Dây dẫn bị tưa, đứt sợi", color: "#FF0066" },
  {
    id: "day_vat_la_bam",
    label: "Dây dẫn bị vật lạ bám vào",
    color: "#99FF00",
  },
  {
    id: "ta_chong_rung_ri_set",
    label: "Tạ chống rung bị rỉ sét",
    color: "#CC6600",
  },
  { id: "long_bulong", label: "Lỏng bulong", color: "#0099CC" },
  { id: "mat_bulong", label: "Mất bulong", color: "#00FF99" },
  { id: "mat_ta", label: "Mất tạ", color: "#9933FF" },
  {
    id: "polyme_ban_phong_dien",
    label: "Cách điện polymer bị bẩn phóng điện",
    color: "#FF3366",
  },
  {
    id: "polyme_cong_venh",
    label: "Cách điện polymer bị cong vênh",
    color: "#66FF00",
  },
  { id: "polyme_rach", label: "Cách điện polymer bị rách", color: "#FFCC00" },
  {
    id: "van_ran_rach_tan",
    label: "Chống sét van bị rạn, rách tán",
    color: "#00FFCC",
  },
];

interface ImagePreviewProps {
  selectedImage: ImageItem | null;
  selectedErrors: ErrorItem[];
  // Callback cập nhật UI local
  onUpdateErrors: (newErrors: ErrorItem[]) => void;
  // Callback gọi API (NEW)
  onAction: (action: "create" | "update" | "delete", error: ErrorItem) => void;

  // [NEW] Controlled Props cho selection
  selectedBoxId: string | null;
  onSelectBox: (id: string | null) => void;
}

type ToolMode = "hand" | "select" | "draw";
type HandleType = "tl" | "tr" | "bl" | "br" | null; // Top-Left, Top-Right...

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  selectedImage,
  selectedErrors,
  onUpdateErrors,
  onAction,
  selectedBoxId, // Nhận từ cha
  onSelectBox, // Gọi lên cha
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dirRef = useRef<HTMLDivElement>(null);

  // State hiển thị
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [mode, setMode] = useState<ToolMode>("select");

  // [NEW] State để theo dõi việc giữ phím Space/Ctrl
  const [isQuickPan, setIsQuickPan] = useState(false);

  // State thao tác
  const [isDragging, setIsDragging] = useState(false); // Chung cho cả Pan và Move Box
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 }); // Tọa độ chuột bắt đầu
  const [startOffset, setStartOffset] = useState({ x: 0, y: 0 }); // Offset ban đầu khi pan

  // State Edit BBox
  const [activeHandle, setActiveHandle] = useState<HandleType>(null);
  const [tempBox, setTempBox] = useState<number[] | null>(null); // [x1, y1, x2, y2] khi đang vẽ mới
  const [initialBoxState, setInitialBoxState] = useState<number[] | null>(null); // Lưu trạng thái bbox trước khi move/resize

  // [QUAN TRỌNG] State cục bộ để vẽ box đang kéo mượt mà (60fps)
  const [draggingBox, setDraggingBox] = useState<number[] | null>(null);

  // Helper xác định mode thực tế (nếu đang giữ Space thì coi như là hand)
  const currentMode = isQuickPan ? "hand" : mode;

  // [NEW] Helper để giới hạn bbox trong khung ảnh
  const clampBBox = useCallback(
    (bbox: number[]): number[] => {
      if (!selectedImage?.currentImage) return bbox;
      const imgWidth = selectedImage.currentImage.width;
      const imgHeight = selectedImage.currentImage.height;

      const [x1, y1, x2, y2] = bbox;
      // Đảm bảo không nhỏ hơn 0 và không lớn hơn kích thước ảnh
      const nx1 = Math.max(0, Math.min(x1, imgWidth));
      const ny1 = Math.max(0, Math.min(y1, imgHeight));
      const nx2 = Math.max(0, Math.min(x2, imgWidth));
      const ny2 = Math.max(0, Math.min(y2, imgHeight));

      return [nx1, ny1, nx2, ny2];
    },
    [selectedImage]
  );

  // [NEW] Xác định Item đang được chọn và kiểm tra tính hợp lệ (không bị rejected)
  // Biến này sẽ dùng để điều kiện hiển thị Popover
  const activeError = selectedErrors.find(
    (e) => e.id === selectedBoxId && e.status !== "rejected"
  );
  const shouldShowPopover = !!activeError && currentMode === "select";

  // --- 1. CORE: Tính toán Metrics render ---
  // Hàm này trả về vị trí và kích thước thực tế của ảnh được vẽ trên canvas
  const getRenderMetrics = useCallback(() => {
    if (!dirRef.current || !selectedImage?.currentImage) return null;

    const containerWidth = dirRef.current.clientWidth - 20;
    const containerHeight = 340;
    const img = selectedImage.currentImage;

    const imageRatio = img.width / img.height;
    const containerRatio = containerWidth / containerHeight;

    let drawWidth, drawHeight;
    if (imageRatio > containerRatio) {
      drawWidth = containerWidth * scale;
      drawHeight = (containerWidth / imageRatio) * scale;
    } else {
      drawHeight = containerHeight * scale;
      drawWidth = containerHeight * imageRatio * scale;
    }

    // Tọa độ góc trên trái của ảnh trên canvas
    const startX = (containerWidth - drawWidth) / 2 + offset.x;
    const startY = (containerHeight - drawHeight) / 2 + offset.y;

    return {
      startX,
      startY,
      drawWidth,
      drawHeight,
      scaleX: drawWidth / img.width, // Tỉ lệ zoom thực tế
      scaleY: drawHeight / img.height,
    };
  }, [selectedImage, scale, offset]);

  // --- 2. CORE: Chuyển đổi tọa độ ---
  // Mouse (Canvas Pixel) -> Image Coordinate (Pixel thực của ảnh)
  const getMousePosInImage = (e: React.MouseEvent | MouseEvent) => {
    const metrics = getRenderMetrics();
    if (!metrics || !canvasRef.current) return null;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    return {
      x: (mouseX - metrics.startX) / metrics.scaleX,
      y: (mouseY - metrics.startY) / metrics.scaleY,
      canvasX: mouseX,
      canvasY: mouseY,
    };
  };

  // --- 3. DRAWING ---
  const draw = useCallback(() => {
    if (!canvasRef.current || !dirRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Background
    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    if (!selectedImage || !selectedImage.currentImage) {
      ctx.fillStyle = "#6c757d";
      ctx.textAlign = "center";
      ctx.fillText(
        "Vui lòng chọn ảnh",
        canvasRef.current.width / 2,
        canvasRef.current.height / 2
      );
      return;
    }

    const metrics = getRenderMetrics();
    if (!metrics) return;

    // Draw Image
    ctx.drawImage(
      selectedImage.currentImage,
      metrics.startX,
      metrics.startY,
      metrics.drawWidth,
      metrics.drawHeight
    );

    // Draw Errors (BBoxes)
    // Helper vẽ 1 box
    const drawBox = (
      bbox: number[],
      colorStr: string,
      isSelected: boolean,
      index?: number,
      label?: string
    ) => {
      const [xmin, ymin, xmax, ymax] = bbox;

      // Convert Image Coords -> Canvas Coords
      const cx = metrics.startX + xmin * metrics.scaleX;
      const cy = metrics.startY + ymin * metrics.scaleY;
      const cw = (xmax - xmin) * metrics.scaleX;
      const ch = (ymax - ymin) * metrics.scaleY;

      ctx.strokeStyle = colorStr;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(cx, cy, cw, ch);

      // Fill nhẹ
      ctx.fillStyle = colorStr.replace(")", ", 0.2)").replace("rgb", "rgba");
      if (colorStr.startsWith("#")) {
        // Hex to rgba hack for simple demo, assume hex passed or handle separately
        ctx.fillStyle = isSelected ? "rgba(255, 255, 0, 0.2)" : "rgba(0,0,0,0)";
      }
      ctx.fillRect(cx, cy, cw, ch);

      // Label
      if (label && index !== undefined) {
        ctx.fillStyle = isSelected
          ? "rgba(255, 0, 0, 0.6)"
          : "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(cx, cy - 22, 25, 20);
        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        // ctx.fillText(`${index + 1}. ${label}`, cx + 5, cy - 8);
        ctx.fillText(`${index + 1}`, cx + 5, cy - 8);
      }

      // Draw Handles if Selected
      if (isSelected) {
        const handleSize = 6;
        ctx.fillStyle = "white";
        ctx.strokeStyle = "red";
        // TL, TR, BL, BR
        const handles = [
          [cx, cy],
          [cx + cw, cy],
          [cx, cy + ch],
          [cx + cw, cy + ch],
        ];
        handles.forEach(([hx, hy]) => {
          ctx.fillRect(
            hx - handleSize / 2,
            hy - handleSize / 2,
            handleSize,
            handleSize
          );
          ctx.strokeRect(
            hx - handleSize / 2,
            hy - handleSize / 2,
            handleSize,
            handleSize
          );
        });
      }
    };

    // Render list boxes
    const visibleErrors = selectedErrors.filter((e) => e.status !== "rejected");

    visibleErrors.forEach((err) => {
      const isSelected = err.id === selectedBoxId;
      // [LOGIC MỚI] Nếu đang kéo box này (draggingBox tồn tại), dùng tọa độ local để vẽ
      // Điều này giúp Box + Label dính chặt vào chuột, không bị lag do chờ server/parent update
      const bboxToDraw = isSelected && draggingBox ? draggingBox : err.bbox;
      drawBox(bboxToDraw, err.color.stroke, isSelected, err.index, err.name);
    });

    // Render Temp Box (Drawing mode)
    if (tempBox) {
      drawBox(tempBox, "#1890ff", true, -1, "New...");
    }
  }, [
    selectedImage,
    selectedErrors,
    selectedBoxId,
    tempBox,
    draggingBox,
    getRenderMetrics,
  ]);

  // --- 4. EVENT HANDLERS ---

  // Check cursor nằm trên handle nào
  const getHoverHandle = (
    mouseX: number,
    mouseY: number,
    bbox: number[],
    metrics: RenderMetrics
  ): HandleType => {
    const [xmin, ymin, xmax, ymax] = bbox;
    const cx = metrics.startX + xmin * metrics.scaleX;
    const cy = metrics.startY + ymin * metrics.scaleY;
    const cw = (xmax - xmin) * metrics.scaleX;
    const ch = (ymax - ymin) * metrics.scaleY;
    const tol = 8; // Tolerance

    if (Math.abs(mouseX - cx) < tol && Math.abs(mouseY - cy) < tol) return "tl";
    if (Math.abs(mouseX - (cx + cw)) < tol && Math.abs(mouseY - cy) < tol)
      return "tr";
    if (Math.abs(mouseX - cx) < tol && Math.abs(mouseY - (cy + ch)) < tol)
      return "bl";
    if (
      Math.abs(mouseX - (cx + cw)) < tol &&
      Math.abs(mouseY - (cy + ch)) < tol
    )
      return "br";
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePosInImage(e);
    if (!pos) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });

    // MODE: HAND
    if (currentMode === "hand") {
      setStartOffset({ ...offset });
      return;
    }

    // MODE: DRAW
    if (currentMode === "draw") {
      onSelectBox(null);
      setTempBox([pos.x, pos.y, pos.x, pos.y]);
      return;
    }

    // MODE: SELECT (Edit)
    if (currentMode === "select") {
      const metrics = getRenderMetrics();
      if (!metrics) return;
      const ctx = canvasRef.current?.getContext("2d");

      // Filter chỉ lấy visible errors để hit test
      const visibleErrors = selectedErrors.filter(
        (e) => e.status !== "rejected"
      );

      // 1. Check Handle Resize của box đang chọn
      if (selectedBoxId) {
        const selectedErr = visibleErrors.find((e) => e.id === selectedBoxId);
        if (selectedErr) {
          const handle = getHoverHandle(
            pos.canvasX,
            pos.canvasY,
            selectedErr.bbox,
            metrics
          );
          if (handle) {
            setActiveHandle(handle);
            setInitialBoxState([...selectedErr.bbox]);
            return;
          }
        }
      }

      // 2. Check Hit Test (Click vào box nào?)
      // Hit test trên danh sách visible
      // Hit Test Box + Label
      const clickedError = [...visibleErrors].reverse().find((err) => {
        const [xmin, ymin, xmax, ymax] = err.bbox;
        const cx = metrics.startX + xmin * metrics.scaleX;
        const cy = metrics.startY + ymin * metrics.scaleY;
        const cw = (xmax - xmin) * metrics.scaleX;
        const ch = (ymax - ymin) * metrics.scaleY;

        // Check Box
        const inBox =
          pos.canvasX >= cx &&
          pos.canvasX <= cx + cw &&
          pos.canvasY >= cy &&
          pos.canvasY <= cy + ch;

        // Check Label
        let inLabel = false;
        if (ctx) {
          ctx.font = "12px Arial";
          const text = `${err.index + 1}. ${err.name || ""}`;
          const labelWidth = ctx.measureText(text).width + 10;
          inLabel =
            pos.canvasX >= cx &&
            pos.canvasX <= cx + labelWidth &&
            pos.canvasY >= cy - 22 &&
            pos.canvasY <= cy;
        }

        return inBox || inLabel;
      });

      if (clickedError) {
        onSelectBox(clickedError.id);
        setInitialBoxState([...clickedError.bbox]); // Lưu vị trí gốc để tính delta move
        setDraggingBox([...clickedError.bbox]); // Init dragging box
        setActiveHandle(null); // Không phải resize
      } else {
        onSelectBox(null);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) {
      if (isQuickPan) {
        canvasRef.current!.style.cursor = "grab";
        return;
      }

      // Logic đổi cursor khi hover
      if (currentMode === "select" && selectedBoxId) {
        const pos = getMousePosInImage(e);
        const metrics = getRenderMetrics();
        const selectedErr = selectedErrors.find(
          (e) => e.id === selectedBoxId && e.status !== "rejected"
        );
        if (pos && metrics && selectedErr) {
          const handle = getHoverHandle(
            pos.canvasX,
            pos.canvasY,
            selectedErr.bbox,
            metrics
          );
          if (handle) {
            canvasRef.current!.style.cursor =
              handle === "tl" || handle === "br"
                ? "nwse-resize"
                : "nesw-resize";
            return;
          }
        }
      }
      canvasRef.current!.style.cursor =
        currentMode === "hand"
          ? "grab"
          : currentMode === "draw"
          ? "crosshair"
          : "default";
      return;
    }

    const pos = getMousePosInImage(e);
    if (!pos) return;

    // HAND PANNING
    if (currentMode === "hand") {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setOffset({ x: startOffset.x + dx, y: startOffset.y + dy });
      // Thêm cursor grabbing khi đang kéo
      canvasRef.current!.style.cursor = "grabbing";
      return;
    }

    // DRAWING NEW BOX
    if (currentMode === "draw" && tempBox) {
      setTempBox([tempBox[0], tempBox[1], pos.x, pos.y]);
      return;
    }

    // EDITING (MOVE / RESIZE)
    if (currentMode === "select" && selectedBoxId && selectedImage) {
      // RESIZE
      if (activeHandle && initialBoxState) {
        // const [ix1, iy1, ix2, iy2] = initialBoxState;
        let [nx1, ny1, nx2, ny2] = initialBoxState;

        // Dựa vào handle nào để cập nhật tọa độ tương ứng
        // Cần đảm bảo x1 < x2, y1 < y2. Nhưng tạm thời cứ cho phép âm, fix lúc mouseup
        if (activeHandle === "tl") {
          nx1 = pos.x;
          ny1 = pos.y;
        }
        if (activeHandle === "tr") {
          nx2 = pos.x;
          ny1 = pos.y;
        }
        if (activeHandle === "bl") {
          nx1 = pos.x;
          ny2 = pos.y;
        }
        if (activeHandle === "br") {
          nx2 = pos.x;
          ny2 = pos.y;
        }

        setDraggingBox(clampBBox([nx1, ny1, nx2, ny2])); // Cập nhật dragging box
        return;
      }

      // MOVE
      if (initialBoxState) {
        // Tính toán delta từ lúc bắt đầu kéo
        // Lấy tọa độ click ban đầu -> tính delta -> cộng vào tọa độ gốc
        // Cách đơn giản hơn: tính delta của Image Coordinate
        // Vì dxImage sai do pos thay đổi liên tục. Cần lấy pos hiện tại trừ pos lúc start drag (đã convert sang image space)

        // Fix logic move:
        // Thay vì cộng dồn, ta lấy (Vị trí chuột hiện tại - Vị trí chuột bắt đầu) + Vị trí Box ban đầu
        const startPosImage = getMousePosInImage({
          clientX: dragStart.x,
          clientY: dragStart.y,
        } as MouseEvent);
        if (!startPosImage) return;

        const moveX = pos.x - startPosImage.x;
        const moveY = pos.y - startPosImage.y;

        const [ox1, oy1, ox2, oy2] = initialBoxState;
        const w = ox2 - ox1;
        const h = oy2 - oy1;

        setDraggingBox(
          clampBBox([
            ox1 + moveX,
            oy1 + moveY,
            ox1 + moveX + w,
            oy1 + moveY + h,
          ])
        );
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setActiveHandle(null);

    // Kết thúc DRAW
    if (currentMode === "draw" && tempBox) {
      // [FIX]: Clamp tempBox trước khi tạo lỗi mới
      const clampedBox = clampBBox(tempBox);

      // Chuẩn hóa toạ độ (min, max)
      const x1 = Math.min(clampedBox[0], clampedBox[2]);
      const x2 = Math.max(clampedBox[0], clampedBox[2]);
      const y1 = Math.min(clampedBox[1], clampedBox[3]);
      const y2 = Math.max(clampedBox[1], clampedBox[3]);

      // Bỏ qua nếu quá nhỏ
      if (x2 - x1 > 5 && y2 - y1 > 5) {
        const newError: ErrorItem = {
          id: uuidv4(),
          index: selectedErrors.length,
          name: CLASSES[0].label, // Default class
          description: "1.0", // Manual add = 100% confidence
          classId: CLASSES[0].id,
          confidence: 1,
          bbox: [x1, y1, x2, y2],
          color: { stroke: CLASSES[0].color, fill: CLASSES[0].color },
          status: "accepted",
        };

        onSelectBox(newError.id); // Chọn ngay box mới
        onAction("create", newError); // GỌI API CREATE

        setMode("select"); // Tự động chuyển về mode select sau khi vẽ
      }
      setTempBox(null);
    }

    if (
      currentMode === "select" &&
      selectedBoxId &&
      draggingBox &&
      initialBoxState
    ) {
      const clampedDraggingBox = clampBBox(draggingBox);
      const [nx1, ny1, nx2, ny2] = clampedDraggingBox;
      const x1 = Math.min(nx1, nx2);
      const x2 = Math.max(nx1, nx2);
      const y1 = Math.min(ny1, ny2);
      const y2 = Math.max(ny1, ny2);

      if (
        x1 !== initialBoxState[0] ||
        y1 !== initialBoxState[1] ||
        x2 !== initialBoxState[2] ||
        y2 !== initialBoxState[3]
      ) {
        // Lúc thả chuột mới gọi update dữ liệu lên Parent
        updateLocalError(selectedBoxId, [x1, y1, x2, y2]);

        const selectedErr = selectedErrors.find((e) => e.id === selectedBoxId);
        if (selectedErr) {
          const updatedError = {
            ...selectedErr,
            bbox: [x1, y1, x2, y2],
            status: "accepted" as const,
          };
          onAction("update", updatedError);
        }
      }

      setDraggingBox(null);
      setInitialBoxState(null);
    } else {
      setDraggingBox(null);
      setInitialBoxState(null);
    }
  };

  // Helper update 1 lỗi trong list
  const updateLocalError = (
    id: string,
    newBbox?: number[],
    newClassId?: string
  ) => {
    let changedError: ErrorItem | null = null;
    const newErrors = selectedErrors.map((e) => {
      if (e.id === id) {
        const updated = { ...e };
        if (newBbox) updated.bbox = newBbox;
        if (newClassId !== undefined) {
          const cls = CLASSES.find((c) => c.id === newClassId.toString());
          if (cls) {
            updated.classId = cls.id;
            updated.name = cls.label;
            updated.color = { stroke: cls.color, fill: cls.color };
          }
        }
        changedError = updated;
        return updated;
      }
      return e;
    });

    onUpdateErrors(newErrors);

    // Nếu là đổi Class -> Gọi API luôn
    if (newClassId !== undefined && changedError) {
      onAction("update", changedError);
    }
  };

  const handleDeleteError = () => {
    if (selectedBoxId) {
      const errorToDelete = selectedErrors.find((e) => e.id === selectedBoxId);
      // [LOGIC MỚI] Thay vì xóa khỏi mảng local, gọi onAction('delete') để cha xử lý (chuyển status)
      if (errorToDelete) onAction("delete", errorToDelete);
    }
  };

  // --- 5. EFFECTS & INIT ---

  // Shortcut Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      // 1. Space: Chuyển sang mode vẽ
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setMode("draw");
        onSelectBox(null);
        return;
      }

      // 2. Ctrl: Bật chế độ kéo nhanh (Hand)
      if (e.key === "Control" && !e.repeat) {
        setIsQuickPan(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Control") {
        setIsQuickPan(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [onSelectBox]); // Empty deps is ok for mode switching

  useEffect(() => {
    const container = dirRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault(); // Chặn việc zoom trang của trình duyệt

        // Tính toán scale mới
        const delta = -e.deltaY * 0.001; // Hệ số nhạy của zoom
        setScale((prevScale) => {
          const newScale = Math.min(Math.max(prevScale + delta, 0.1), 5); // Limit 0.1 -> 5
          return newScale;
        });
      }
    };

    // Thêm listener với passive: false để có thể preventDefault
    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // Init Canvas Size
  useEffect(() => {
    if (dirRef.current && canvasRef.current) {
      canvasRef.current.width = dirRef.current.clientWidth - 20;
      canvasRef.current.height = 340;
    }
  }, []);

  // Redraw loop
  useEffect(() => {
    requestAnimationFrame(draw);
  }, [draw]);

  // Handle Zoom buttons
  const handleReset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  // --- RENDER POPUP ---
  const renderPopoverContent = () => {
    // SỬ DỤNG activeError ĐÃ LỌC
    if (!activeError) return null;
    // const selectedErr = selectedErrors.find(
    //   (e) => e.id === selectedBoxId && e.status !== "rejected"
    // );
    // if (!selectedErr) return null;
    return (
      <div style={{ width: 200 }}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <b>Chỉnh sửa lỗi #{activeError.index + 1}</b>
          <Select
            style={{ width: "100%" }}
            value={activeError.classId}
            onChange={(val) => updateLocalError(activeError.id, undefined, val)}
            options={CLASSES.map((c) => ({ label: c.label, value: c.id }))}
          />
          <Button
            danger
            block
            icon={<DeleteOutlined />}
            onClick={handleDeleteError}
          >
            Xóa vùng chọn
          </Button>
        </Space>
      </div>
    );
  };

  // Tính vị trí Popover (Tương đối theo box đang chọn)
  // Đây là mẹo: tạo 1 div ẩn nằm đúng vị trí box để neo Popover vào
  const getPopoverTarget = () => {
    // SỬ DỤNG activeError ĐÃ LỌC
    if (!activeError) return { left: 0, top: 0, width: 0, height: 0 };

    const metrics = getRenderMetrics();

    let bbox = activeError.bbox;
    if (draggingBox && activeError.id === selectedBoxId) {
      bbox = draggingBox;
    }

    if (!metrics || !bbox) return { left: 0, top: 0, width: 0, height: 0 };
    const [xmin, ymin, xmax, ymax] = bbox;
    return {
      left: metrics.startX + xmin * metrics.scaleX,
      top: metrics.startY + ymin * metrics.scaleY,
      width: (xmax - xmin) * metrics.scaleX,
      height: (ymax - ymin) * metrics.scaleY,
    };
  };
  const popoverTarget = getPopoverTarget();

  return (
    <div
      ref={dirRef}
      style={{
        backgroundColor: "white",
        padding: "10px",
        borderRadius: "10px",
        width: "100%",
        position: "relative",
      }}
    >
      {/* TOOLBAR */}
      <div
        style={{
          marginBottom: "10px",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <Space>
          <Tooltip title="Di chuyển (Giữ Ctrl để dùng nhanh)">
            <Button
              type={currentMode === "hand" ? "primary" : "default"}
              icon={<DragOutlined />}
              onClick={() => setMode("hand")}
            />
          </Tooltip>
          <Tooltip title="Chế độ chọn/sửa">
            <Button
              type={currentMode === "select" ? "primary" : "default"}
              icon={<SelectOutlined />}
              onClick={() => setMode("select")}
            />
          </Tooltip>
          <Tooltip title="Vẽ vùng lỗi mới (Phím tắt: Space)">
            <Button
              type={currentMode === "draw" ? "primary" : "default"}
              icon={<PlusSquareOutlined />}
              onClick={() => setMode("draw")}
            />
          </Tooltip>
        </Space>

        <Space>
          <Button
            icon={<ZoomInOutlined />}
            onClick={() => setScale((s) => Math.min(s + 0.2, 5))}
          />
          <Button
            icon={<ZoomOutOutlined />}
            onClick={() => setScale((s) => Math.max(s - 0.2, 0.1))}
          />
          <Button icon={<UndoOutlined />} onClick={handleReset}>
            Reset
          </Button>
        </Space>
      </div>

      {/* CANVAS CONTAINER */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          height: 340,
          border: "1px solid #f0f0f0",
          borderRadius: 4,
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ display: "block" }}
        />

        {/* POPOVER ANCHOR */}
        {shouldShowPopover && (
          <Popover
            content={renderPopoverContent()}
            title="Sửa nhãn"
            trigger="click"
            open={!isDragging} // Luôn hiện khi có box được chọn
            getPopupContainer={(trigger) => trigger.parentElement!} // Render ngay trong div này để không bị lệch khi scroll trang
            placement="rightTop"
          >
            <div
              style={{
                position: "absolute",
                border: "1px dashed transparent", // Invisible box overlay
                pointerEvents: "none",
                left: popoverTarget.left,
                top: popoverTarget.top,
                width: popoverTarget.width,
                height: popoverTarget.height,
              }}
            />
          </Popover>
        )}
      </div>

      <div
        style={{
          marginTop: 5,
          fontSize: 12,
          color: "#888",
          textAlign: "center",
        }}
      >
        {isQuickPan
          ? "Đang giữ phím tắt: Kéo chuột để di chuyển ảnh"
          : mode === "select"
          ? "Click vào khung để sửa, kéo cạnh để resize (Giữ Ctrl để di chuyển, Space để vẽ)"
          : mode === "draw"
          ? "Kéo thả chuột để vẽ vùng lỗi mới (Giữ Ctrl để di chuyển)"
          : "Kéo chuột để di chuyển ảnh"}
      </div>
    </div>
  );
};
