import apiClient from "./client";

export interface DesignationPayload {
  name: string;
  description: string;
  status: "Active" | "Inactive" | boolean;
}

export interface GetDesignationsParams {
  search?: string;
  page?: number;
  limit?: number;
}

export const getDesignations = (params?: string | GetDesignationsParams) => {
  if (typeof params === "string") {
    return apiClient.get("/designations", {
      params: params ? { search: params } : {},
    });
  }
  return apiClient.get("/designations", {
    params: params || {},
  });
};

export const createDesignation = (designation: DesignationPayload) =>
  apiClient.post("/designations", designation);

export const updateDesignation = (id: string | number, designation: DesignationPayload) =>
  apiClient.put(`/designations/${id}`, designation);

export const deleteDesignation = (id: string | number) =>
  apiClient.delete(`/designations/${id}`);