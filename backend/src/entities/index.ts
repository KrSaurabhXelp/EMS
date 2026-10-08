import { User, type RoleType } from "./User";
import { Designation } from "./Designations";
import { Employees } from "./Employees";
import { Tasks } from "./Tasks";
import { FcmToken } from "./FcmToken";
import { Notification } from "./Notification";

export { User, type RoleType, Designation, Employees, Tasks, FcmToken, Notification };

export const entities = [
  Designation,
  Employees,
  Tasks,
  User,
  FcmToken,
  Notification,
];

export default entities;
