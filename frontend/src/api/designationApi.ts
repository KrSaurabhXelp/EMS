import axios from "axios";

const API = "http://192.168.2.237:5000/api/designations";

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
    return axios.get(API, {
      params: params ? { search: params } : {},
    });
  }
  return axios.get(API, {
    params: params || {},
  });
};

export const createDesignation = (designation: DesignationPayload) =>
  axios.post(API, designation);

export const updateDesignation = (id: string | number, designation: DesignationPayload) =>
  axios.put(`${API}/${id}`, designation);

export const deleteDesignation = (id: string | number) =>
  axios.delete(`${API}/${id}`);