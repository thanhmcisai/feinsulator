"use client";

import "@ant-design/v5-patch-for-react-19";
import React, { useState } from "react";
import { Row, Col, notification } from "antd";
import { ImageUploader } from "@/components/ImageUploader";
import { ImageList } from "@/components/ImageList";
import { ImagePreview } from "@/components/ImagePreview";
import { ErrorList } from "@/components/ErrorList";
import { ImageItem, ErrorItem, PredictResponse } from "@/types";
import dayjs from "dayjs";

// Các hằng số
const IMAGE_NAME_PREFIX = "image_";
const NOTIFICATION_DURATION = 2;

// Hàm tiện ích
const generateRandomName = (count: number) => {
  return IMAGE_NAME_PREFIX + dayjs().unix().toString() + "_" + count;
};

export default function Home() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [selectedErrors, setSelectedErrors] = useState<ErrorItem[]>([]);

  // [NEW] Quản lý state box đang chọn tại đây
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);

  const [ntf, contextHolder] = notification.useNotification();
  const [isLoading, setIsLoading] = useState(false);

  const showErrorNotification = (message: string) => {
    ntf.error({ message, duration: NOTIFICATION_DURATION });
  };

  const showSuccessNotification = (message: string) => {
    ntf.success({ message, duration: NOTIFICATION_DURATION });
  };

  const usePredictAPI = () => {
    // 1. API Predict
    const predictImage = async (
      file: File
    ): Promise<PredictResponse | null> => {
      try {
        const formData = new FormData();
        formData.append("image", file);
        const response = await fetch("/api/predict-insulator", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) throw new Error("API Error");
        return await response.json();
      } catch (error) {
        console.error(error);
        showErrorNotification("Lỗi khi kết nối đến server AI");
        return null;
      }
    };

    // 2. API Update Status/BBox/Class
    const updateErrorStatus = async (
      imageId: string,
      errorId: string,
      classId: string | number, // Chấp nhận cả string (id từ CLASSES)
      status: string | null,
      bbox: number[]
    ) => {
      try {
        const response = await fetch("/api/update-error-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageId, errorId, classId, status, bbox }),
        });
        if (!response.ok) showErrorNotification("Lỗi khi cập nhật lỗi");
        else showSuccessNotification("Cập nhật lỗi thành công");
      } catch (error) {
        console.error("Failed to update status", error);
        showErrorNotification("Lỗi khi cập nhật lỗi");
      }
    };

    // 3. API Create Error (NEW)
    const createError = async (imageId: string, error: ErrorItem) => {
      try {
        const tempId = error.id; // ID client tạo

        const response = await fetch("/api/create-error", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageId, error }),
        });

        const resp = await response.json();

        if (
          resp.success &&
          resp.data &&
          resp.data.error_item &&
          resp.data.error_item.id
        ) {
          const realId = resp.data.error_item.id; // ID server trả về

          // --- ID SWAPPING LOGIC ---
          setImages((prev) => {
            const newImages = prev.map((img) => {
              if (img.id === imageId) {
                // Tìm và thay thế tempId bằng realId trong danh sách lỗi
                const newErrors = img.errors.map((e) => {
                  if (e.id === tempId) {
                    return { ...e, id: realId }; // Swap ID
                  }
                  return e;
                });
                return { ...img, errors: newErrors };
              }
              return img;
            });

            // Đồng bộ lại selectedImage và selectedErrors
            const current = newImages.find((i) => i.src === selectedImage?.src);
            if (current) {
              setSelectedImage(current);
              setSelectedErrors(current.errors);
            }

            return newImages;
          });

          // Nếu người dùng đang chọn box vừa tạo (vẫn đang giữ tempId), cập nhật lại thành realId
          if (selectedBoxId === tempId) {
            setSelectedBoxId(realId);
          }

          setSelectedBoxId((prevBoxId) =>
            prevBoxId === tempId ? realId : prevBoxId
          );

          showSuccessNotification("Đã lưu lỗi mới lên server");
        } else {
          showErrorNotification("Lỗi khi lưu lỗi mới lên server");
        }
      } catch (error) {
        console.error(error);
        showErrorNotification("Lỗi khi thêm mới");
      }
    };

    // // 4. API Delete Error (NEW)
    // const deleteError = async (imageId: string, errorId: string) => {
    //   try {
    //     await fetch("/api/delete-error", {
    //       method: "POST",
    //       headers: { "Content-Type": "application/json" },
    //       body: JSON.stringify({ imageId, errorId }),
    //     });
    //     showSuccessNotification("Đã xóa lỗi");
    //   } catch (error) {
    //     console.error(error);
    //     showErrorNotification("Lỗi khi xóa");
    //   }
    // };

    return { predictImage, updateErrorStatus, createError };
  };

  const { predictImage, updateErrorStatus, createError } = usePredictAPI();

  // Xử lý tải ảnh lên
  const [debouncedUpload] = useState(() => {
    let timeoutId: NodeJS.Timeout;
    return (file: File, fileList: File[]) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      return new Promise<boolean>((resolve) => {
        timeoutId = setTimeout(async () => {
          setIsLoading(true);
          try {
            let count = 0;
            let currentImage: HTMLImageElement | null = null;
            for (const file of fileList) {
              const reader = new FileReader();
              const src = await new Promise<string>((resolve) => {
                reader.onload = (e) => {
                  const img = new Image();
                  img.onload = function () {
                    currentImage = img;
                  };
                  img.src = e.target?.result as string;
                  return resolve(e.target?.result as string);
                };
                reader.readAsDataURL(file);
              });

              const result = await predictImage(file);
              if (result) {
                const newImage = createNewImage(
                  count,
                  src,
                  result.errors,
                  currentImage,
                  result.imageId
                );
                addNewImage(newImage);
              }
              count++;
            }
            resolve(true);
          } finally {
            setIsLoading(false);
          }
        }, 500);
      });
    };
  });

  const handleUpload = async (file: File, fileList: File[]) => {
    return debouncedUpload(file, fileList);
  };

  const createNewImage = (
    count: number,
    src: string,
    errors: ErrorItem[],
    currentImage: HTMLImageElement | null,
    dbId: string
  ): ImageItem => ({
    id: dbId,
    src,
    name: generateRandomName(count),
    errors,
    currentImage,
  });

  const addNewImage = (newImage: ImageItem) => {
    setImages((prev) => [...prev, newImage]);
    if (!selectedImage) {
      setSelectedImage(newImage);
      setSelectedErrors(newImage.errors);
    }
  };

  const handleRemove = (index: number) => {
    setImages((prev) => {
      const newArr = [...prev];
      const removed = newArr.splice(index, 1);
      if (!removed || removed.length === 0) {
        setSelectedImage(null);
        setSelectedErrors([]);
      }
      if (removed[0].src === selectedImage?.src) {
        setSelectedImage(newArr[0] || null);
        setSelectedErrors(newArr[0]?.errors || []);
      }
      return newArr;
    });
  };

  // Callback xử lý UI (Local state)
  const handleUpdateErrors = (newErrors: ErrorItem[]) => {
    const newImages = images.map((img) => {
      if (img.src === selectedImage?.src) {
        return { ...img, errors: newErrors };
      }
      return img;
    });
    setImages(newImages);

    const current = newImages.find((i) => i.src === selectedImage?.src);
    if (current) {
      setSelectedImage(current);
      setSelectedErrors(newErrors);
    }
  };

  // Callback xử lý Verify (Accept/Reject)
  const handleVerifyError = (
    errorId: string,
    status: "accepted" | "rejected" | null
  ) => {
    let targetImageId = "";
    let targetBbox: number[] = [];
    let classId: string | number = "";

    const newImages = images.map((img) => {
      if (img.src === selectedImage?.src) {
        targetImageId = img.id;
        const newErrors = img.errors.map((err) => {
          if (err.id === errorId) {
            targetBbox = err.bbox;
            classId = err.classId;
            return { ...err, status };
          }
          return err;
        });
        return { ...img, errors: newErrors };
      }
      return img;
    });
    setImages(newImages);
    const updatedSelectedImage = newImages.find(
      (img) => img.src === selectedImage?.src
    );
    if (updatedSelectedImage) {
      setSelectedImage(updatedSelectedImage);
    }

    if (targetImageId) {
      updateErrorStatus(targetImageId, errorId, classId, status, targetBbox);
    }
  };

  // --- HÀM XỬ LÝ ACTION TỪ IMAGE PREVIEW (Create, Update BBox, Delete) ---
  const handleErrorAction = (
    action: "create" | "update" | "delete",
    error: ErrorItem
  ) => {
    if (!selectedImage?.id) return;

    switch (action) {
      case "create":
        const createdError = {
          ...error,
          status: "accepted" as const,
          confidence: 1,
        };
        // Update local state ngay để UI phản hồi
        handleUpdateErrors([...selectedErrors, createdError]);

        createError(selectedImage.id, error);
        break;
      case "update":
        const updatedError = {
          ...error,
          status: "accepted" as const,
        };

        // Update local state
        handleUpdateErrors(
          selectedErrors.map((e) => (e.id === error.id ? updatedError : e))
        );

        updateErrorStatus(
          selectedImage.id,
          error.id,
          error.classId,
          "accepted",
          error.bbox
        );
        break;
      case "delete":
        const rejectedError = { ...error, status: "rejected" as const };

        // Update local state
        handleUpdateErrors(
          selectedErrors.map((e) => (e.id === error.id ? rejectedError : e))
        );

        // Gọi API update status thành rejected
        updateErrorStatus(
          selectedImage.id,
          error.id,
          error.classId,
          "rejected",
          error.bbox
        );

        // Bỏ chọn box hiện tại
        setSelectedBoxId(null);
        // showSuccessNotification("Đã xóa");
        break;
    }
  };

  return (
    <div
      style={{ padding: "28px 100px", flex: 1 }}
      className="content-container"
    >
      {contextHolder}
      <Row justify="center" style={{ marginBottom: 24, width: "100%" }}>
        <Col span={24}>
          <ImageUploader onUpload={handleUpload} isLoading={isLoading} />
        </Col>
      </Row>
      <Row gutter={12} style={{ width: "100%" }}>
        <Col sm={24} md={6} style={{ marginBottom: 12 }}>
          <ImageList
            images={images}
            selectedImage={selectedImage}
            onSelect={setSelectedImage}
            onRemove={handleRemove}
            setSelectedErrors={setSelectedErrors}
          />
        </Col>
        <Col sm={24} md={12} style={{ marginBottom: 12 }}>
          <ImagePreview
            selectedImage={selectedImage}
            selectedErrors={selectedErrors}
            onUpdateErrors={handleUpdateErrors} // Update UI
            onAction={handleErrorAction} // Update API
            selectedBoxId={selectedBoxId} // [NEW] Controlled Prop
            onSelectBox={setSelectedBoxId} // [NEW] Controlled Prop
          />
        </Col>
        <Col sm={24} md={6} style={{ marginBottom: 12 }}>
          <ErrorList
            selectedImage={selectedImage}
            setSelectedErrors={setSelectedErrors}
            selectedErrors={selectedErrors}
            onVerifyError={handleVerifyError}
            selectedBoxId={selectedBoxId}
            onSelectBox={setSelectedBoxId}
          />
        </Col>
      </Row>
    </div>
  );
}
