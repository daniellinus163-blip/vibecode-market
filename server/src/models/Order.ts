import mongoose, { Schema, Document } from "mongoose";

export type OrderStatus =
  | "placed"
  | "paid"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  titleSnapshot: string;
  imageSnapshot: string;
  variantLabel: string;
  quantity: number;
  unitPriceCents: number;
}

export interface IOrderStatusEvent {
  status: OrderStatus;
  at: Date;
  note?: string;
}

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId;
  items: IOrderItem[];
  currency: string;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  couponCode?: string;
  address: {
    fullName: string;
    line1: string;
    line2?: string;
    city: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  status: OrderStatus;
  statusEvents: IOrderStatusEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    titleSnapshot: { type: String, required: true },
    imageSnapshot: { type: String, required: true },
    variantLabel: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPriceCents: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const StatusEventSchema = new Schema<IOrderStatusEvent>(
  {
    status: {
      type: String,
      enum: ["placed", "paid", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"],
      required: true,
    },
    at: { type: Date, required: true },
    note: String,
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: { type: [OrderItemSchema], default: [] },
    currency: { type: String, default: "USD" },
    subtotalCents: { type: Number, required: true, min: 0 },
    discountCents: { type: Number, required: true, min: 0 },
    shippingCents: { type: Number, required: true, min: 0 },
    totalCents: { type: Number, required: true, min: 0 },
    couponCode: String,
    address: {
      fullName: { type: String, required: true },
      line1: { type: String, required: true },
      line2: String,
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
      phone: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ["placed", "paid", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"],
      default: "placed",
    },
    statusEvents: { type: [StatusEventSchema], default: [] },
  },
  { timestamps: true }
);

export const Order = mongoose.model<IOrder>("Order", OrderSchema);

