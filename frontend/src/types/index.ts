export type RoleName = 'Administrator' | 'Finance Director' | 'IT Specialist' | 'Property Manager' | 'Inventory Clerk' | 'Maintenance Technician' | 'Site Procurement Officer';

export interface Role {
  id: string;
  name: RoleName;
  description?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role_id: string;
  property_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  role?: Role;
  assigned_property?: Property;
}

export interface Property {
  id: string;
  name: string;
  location: string;
  description?: string;
  manager_id?: string;
  created_at: string;
  updated_at?: string;
  manager?: User;
}

export type AssetStatus = 'In Stock' | 'Deployed' | 'Maintenance' | 'Retired';

export interface AssetType {
  id: string;
  name: string;
  description?: string;
  manufacturer?: string;
  model?: string;
}

export interface Asset {
  id: string;
  asset_tag: string;
  serial_number: string;
  asset_type_id: string;
  property_id: string;
  status: AssetStatus;
  purchase_date?: string;
  warranty_expiry?: string;
  created_at: string;
  updated_at?: string;
  asset_type?: AssetType;
  property?: Property;
}

export interface PurchaseRequestItem {
  id: string;
  purchase_request_id: string;
  asset_type_id: string;
  quantity: number;
  estimated_price: number;
  asset_type?: AssetType;
}

export interface PurchaseRequest {
  id: string;
  requested_by: string;
  property_id: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  justification: string;
  created_at: string;
  updated_at?: string;
  property?: Property;
  requester?: User;
  items?: PurchaseRequestItem[];
}

export interface PurchaseOrder {
  id: string;
  purchase_request_id: string;
  po_number: string;
  total_amount: number;
  status: string;
  generated_pdf_path?: string;
  created_at: string;
  purchase_request?: PurchaseRequest;
}
