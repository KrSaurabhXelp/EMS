import axios from "axios";

const API = "http://192.168.2.237:5000/api/tasks";

export const getTasks = async () => {
    const response = await axios.get(API);
    return response.data;
};

export const createTasks = async (task: any) => {
    const response = await axios.post(API, task);
    return response.data;
};

export const updateTask = async (id: string | number, task: any) => {
    const response = await axios.put(`${API}/${id}`, task);
    return response.data;
};

export const deleteTask = async (id: string | number) => {
    const response = await axios.delete(`${API}/${id}`);
    return response.data;
};
