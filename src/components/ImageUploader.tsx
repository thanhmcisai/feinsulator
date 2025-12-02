import React from "react";
import { Upload } from "antd";
import { InboxOutlined } from "@ant-design/icons";

const { Dragger } = Upload;

interface ImageUploaderProps {
  onUpload: (file: File, fileList: File[]) => Promise<boolean> | boolean;
  isLoading: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUpload,
  isLoading,
}) => {
  return (
    <Dragger
      multiple
      showUploadList={false}
      beforeUpload={onUpload}
      accept="image/*"
      style={{ backgroundColor: "white" }}
      disabled={isLoading}
    >
      <p className="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p>Nhấp hoặc kéo tệp vào khu vực này để tải lên</p>
      <p>Hỗ trợ tải lên một hoặc nhiều file</p>
    </Dragger>
  );
};
