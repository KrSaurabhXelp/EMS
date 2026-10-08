import axios from "axios";

const API = "http://192.168.2.237:5000/api/employees";

export const getEmployees = async () => {
    const response = await axios.get(API);
    return response.data;
};

export const createEmployee = async (employee: any) => {
    const response = await axios.post(API, employee);
    return response.data;
};

export const updateEmployee = async (id: string | number, employee: any) => {
    const response = await axios.put(`${API}/${id}`, employee);
    return response.data;
};

export const deleteEmployee = async (id: string | number) => {
    const response = await axios.delete(`${API}/${id}`);
    return response.data;
};