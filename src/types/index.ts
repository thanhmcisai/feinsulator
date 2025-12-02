export interface ImageItem {
  id: string;
  src: string;
  name: string;
  errors: ErrorItem[];
  currentImage: HTMLImageElement | null;
}

export interface ErrorItem {
  index: number;
  id: string;
  name: string;
  description?: string;
  classId: string;
  confidence: number;
  bbox: number[];
  color: {
    stroke: string;
    fill: string;
  };
  status: "accepted" | "rejected" | null;
}

export interface ErrorList {
  errors: ErrorItem[];
}

export interface PredictResponse {
  imageId: string; // Server trả về ID của ảnh sau khi lưu
  errors: ErrorItem[]; // Danh sách lỗi kèm ID
}

export interface AIServerPredictResult {
  bbox_id: string;
  class_id: string;
  confidence: number;
  bbox: number[];
  status: "accepted" | "rejected" | null;
}

export interface AIServerPredictResponse {
  image_id: string;
  image_src: string;
  results: AIServerPredictResult[];
}

export interface RenderMetrics {
  startX: number;
  startY: number;
  drawWidth: number;
  drawHeight: number;
  scaleX: number;
  scaleY: number;
}
