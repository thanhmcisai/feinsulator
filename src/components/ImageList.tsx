import React from "react";
import { Card, List, Image, Button } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { ErrorItem, ImageItem } from "@/types";

// Các hằng số
const CARD_STYLES = {
  height: 400,
  overflowY: "auto" as const,
};

const SELECTED_BACKGROUND = "#e6f7ff";
const THUMBNAIL_WIDTH = 48;

interface ImageListProps {
  images: ImageItem[];
  selectedImage: ImageItem | null;
  onSelect: (item: ImageItem) => void;
  onRemove: (index: number) => void;
  setSelectedErrors: (errors: ErrorItem[]) => void;
}

const ImageListItem: React.FC<{
  item: ImageItem;
  index: number;
  isSelected: boolean;
  onSelect: (item: ImageItem) => void;
  onRemove: (index: number) => void;
  setSelectedErrors: (errors: ErrorItem[]) => void;
}> = ({ item, index, isSelected, onSelect, onRemove, setSelectedErrors }) => {
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(index);
  };

  return (
    <List.Item
      key={index}
      style={{
        cursor: "pointer",
        background: isSelected ? SELECTED_BACKGROUND : undefined,
      }}
      onClick={() => {
        onSelect(item);
        setSelectedErrors(item.errors);
      }}
      actions={[
        <Button
          key="delete"
          danger
          type="text"
          icon={<DeleteOutlined />}
          onClick={handleRemove}
        />,
      ]}
    >
      <List.Item.Meta
        avatar={
          <Image width={THUMBNAIL_WIDTH} src={item.src} alt={item.name} />
        }
        title={item.name}
      />
    </List.Item>
  );
};

export const ImageList: React.FC<ImageListProps> = ({
  images,
  selectedImage,
  onSelect,
  onRemove,
  setSelectedErrors,
}) => {
  const renderItem = (item: ImageItem, index: number) => (
    <ImageListItem
      item={item}
      index={index}
      isSelected={selectedImage?.src === item.src}
      onSelect={onSelect}
      setSelectedErrors={setSelectedErrors}
      onRemove={onRemove}
    />
  );

  return (
    <Card title="ẢNH GỐC" style={CARD_STYLES}>
      <List
        itemLayout="horizontal"
        dataSource={images}
        locale={{ emptyText: "Chưa có ảnh nào" }}
        renderItem={renderItem}
      />
    </Card>
  );
};
