import React from "react";
import { Card, Checkbox, List, Button, Tooltip } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { ErrorItem, ImageItem } from "@/types";

// 1. Cập nhật Type cho Props
// Bạn cần đảm bảo type ErrorItem có thêm trường status?: 'accepted' | 'rejected' | null
interface ErrorListProps {
  selectedImage: ImageItem | null;
  selectedErrors: ErrorItem[];
  setSelectedErrors: (errors: ErrorItem[]) => void;
  // Callback function để xử lý logic update state ở component cha
  onVerifyError: (
    errorId: string,
    status: "accepted" | "rejected" | null
  ) => void;
  // [NEW] Props để đồng bộ việc chọn
  selectedBoxId: string | null;
  onSelectBox: (id: string | null) => void;
}

export const ErrorList: React.FC<ErrorListProps> = ({
  selectedImage,
  setSelectedErrors,
  selectedErrors,
  onVerifyError,
  selectedBoxId, // Nhận ID đang chọn
  onSelectBox, // Hàm để set ID chọn
}) => {
  const handleErrorChange = (item: ErrorItem, checked: boolean) => {
    if (checked) {
      if (item.status === "rejected") {
        // 1. Gọi API/Parent update status về null (Bình thường)
        onVerifyError(item.id, null);

        // 2. Update UI ngay lập tức: Tạo item mới với status null
        const revivedItem = { ...item, status: null };
        setSelectedErrors([...selectedErrors, revivedItem]);
      } else {
        setSelectedErrors([...selectedErrors, item]);
      }
      onSelectBox(item.id); // [Optional] Khi check vào thì chọn luôn
    } else {
      setSelectedErrors(selectedErrors.filter((error) => error.id !== item.id));
      if (selectedBoxId === item.id) onSelectBox(null); // Bỏ chọn nếu đang select nó
    }
  };

  const renderErrorItem = (item: ErrorItem) => {
    // Kiểm tra xem item này đã được chọn trong checkbox chưa
    const isChecked = selectedErrors.some((e) => e.id === item.id);

    // Lấy status hiện tại (giả sử bạn đã thêm field này vào data)
    // Nếu chưa có trong type, bạn có thể cast tạm: (item as any).status
    const status = (item as ErrorItem).status;

    const isSelected = item.id === selectedBoxId; // Kiểm tra xem item này có đang được chọn không

    // --- LOGIC MỚI: Xử lý nút Accept ---
    const handleAccept = (e: React.MouseEvent) => {
      e.stopPropagation(); // Ngăn sự kiện click dòng (để không bị toggle select lại)
      const newStatus = status === "accepted" ? null : "accepted";
      onVerifyError(item.id, newStatus);

      // QUAN TRỌNG: Nếu chuyển thành Accepted mà đang bị ẩn (unchecked)
      // thì phải thêm lại vào list selectedErrors để nó hiện lên Canvas ngay lập tức.
      if (newStatus === "accepted") {
        // Nếu đang chưa được chọn (bị ẩn), thì thêm vào list selectedErrors
        if (!isChecked) {
          // QUAN TRỌNG: Phải tạo object mới với status="accepted"
          // Nếu dùng 'item' cũ (đang là rejected), Canvas sẽ lọc bỏ và không vẽ.
          const updatedItem = { ...item, status: "accepted" as const };
          setSelectedErrors([...selectedErrors, updatedItem]);
        } else {
          // Nếu đang được chọn rồi, ta cũng nên update lại status trong selectedErrors
          // để màu sắc trên Canvas đổi ngay sang màu xanh (accepted)
          const updatedList = selectedErrors.map((e) =>
            e.id === item.id ? { ...e, status: "accepted" as const } : e
          );
          setSelectedErrors(updatedList);
        }
      } else {
        // Trường hợp hủy accept (về null)
        const updatedList = selectedErrors.map((e) =>
          e.id === item.id ? { ...e, status: null } : e
        );
        setSelectedErrors(updatedList);
      }
    };

    // --- LOGIC MỚI: Xử lý nút Reject ---
    const handleReject = (e: React.MouseEvent) => {
      e.stopPropagation();
      const newStatus = status === "rejected" ? null : "rejected";
      onVerifyError(item.id, newStatus);

      // (Tùy chọn) Nếu Reject thì tự động ẩn (bỏ check) cho gọn giao diện
      if (newStatus === "rejected" && isChecked) {
        setSelectedErrors(selectedErrors.filter((e) => e.id !== item.id));
      }
    };

    return (
      <List.Item
        // [NEW] Thêm style background khi được chọn
        style={{
          backgroundColor: isSelected ? "#e6f7ff" : "transparent", // Màu xanh nhạt chuẩn Antd
          cursor: "pointer",
          transition: "background-color 0.3s",
          paddingLeft: 8, // Thêm chút padding để màu nền đẹp hơn
          paddingRight: 8,
        }}
        // [NEW] Sự kiện click vào dòng để chọn
        onClick={() => onSelectBox(item.id)}
        // Thêm 2 nút Action vào bên phải mỗi Item
        actions={[
          <Tooltip title="Chính xác" key="accept">
            <Button
              type={status === "accepted" ? "primary" : "text"}
              size="small"
              shape="circle"
              icon={<CheckOutlined />}
              style={{ color: status === "accepted" ? "#fff" : "#52c41a" }}
              // Nếu đã accepted thì màu nền xanh, chưa thì icon xanh
              className={status === "accepted" ? "bg-green-500" : ""}
              onClick={handleAccept}
            />
          </Tooltip>,
          <Tooltip title="Sai / Báo cáo lại" key="reject">
            <Button
              type={status === "rejected" ? "primary" : "text"}
              size="small"
              shape="circle"
              danger={true} // Màu đỏ của Antd
              icon={<CloseOutlined />}
              // Logic toggle: nếu đang reject bấm lại thì hủy reject (về null)
              onClick={handleReject}
            />
          </Tooltip>,
        ]}
      >
        <Checkbox
          checked={isChecked}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleErrorChange(item, e.target.checked)}
          style={{
            textDecoration: status === "rejected" ? "line-through" : "none",
            opacity: status === "rejected" ? 0.5 : 1,
            width: "100%",
          }}
        >
          <span style={{ userSelect: "none" }}>
            {`(${item.index + 1}). ${item.name} `}
            <span style={{ color: "#888", fontSize: "0.85em" }}>
              {`(${(Number(item.confidence) * 100).toFixed(1)}%)`}
            </span>
          </span>
        </Checkbox>
      </List.Item>
    );
  };

  return (
    <Card
      title="DANH SÁCH THIẾT BỊ VÀ LỖI"
      extra={
        <span style={{ fontSize: 12, color: "#666" }}>
          {selectedImage?.errors?.length || 0} phát hiện
        </span>
      }
      style={{ height: 400, display: "flex", flexDirection: "column" }}
      styles={{ body: { flex: 1, overflowY: "auto", padding: "0 12px" } }}
    >
      <List
        dataSource={selectedImage?.errors}
        renderItem={renderErrorItem}
        locale={{ emptyText: "Không có lỗi nào" }}
        itemLayout="horizontal"
      />
    </Card>
  );
};
