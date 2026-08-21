import { MessageType } from "./message-types.js";

export interface ErrorPayload {
  code: string;
  message: string;
}

export interface User {
  id: number;
  username: string;
}

export interface Group {
  id: number;
  name: string;
  ownerId: number;
}

export interface GroupSummary {
  id: number;
  name: string;
  role: "OWNER" | "MEMBER" | null;
}

export interface GroupMember {
  id: number;
  username: string;
  joinedAt: string;
}

export interface ChatMessage {
  id: number;
  groupId: number;
  sender: User;
  content: string;
  createdAt: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface CreateGroupPayload {
  name: string;
}

export interface GroupIdPayload {
  groupId: number;
}

export interface MemberPayload {
  groupId: number;
  userId: number;
}

export interface SendMessagePayload {
  groupId: number;
  content: string;
}

export interface GetMessagesPayload {
  groupId: number;
  limit: number;
  offset: number;
}

export interface RequestMessage<T = unknown> {
  type: MessageType;
  requestId: string;
  payload: T;
}

export interface ResponseMessage<T = unknown> {
  type: MessageType;
  requestId: string;
  success: boolean;
  payload?: T;
  error?: ErrorPayload;
}

export interface EventMessage<T = unknown> {
  type: MessageType;
  payload: T;
}

export interface ControlMessage {
  type:
    | MessageType.PING
    | MessageType.PONG;
}

export interface RegisterPayload {
  username: string;
  password: string;
}



export interface ErrorMessage {
  type: MessageType.ERROR;
  requestId?: string;
  payload: ErrorPayload;
}

export type LoginRequest = RequestMessage<LoginPayload>;

export type CreateGroupRequest = RequestMessage<CreateGroupPayload>;

export type GetGroupsRequest = RequestMessage<Record<string, never>>;

export type GroupRequest = RequestMessage<GroupIdPayload>;

export type MemberRequest = RequestMessage<MemberPayload>;

export type SendMessageRequest = RequestMessage<SendMessagePayload>;

export type GetMessagesRequest = RequestMessage<GetMessagesPayload>;

export type GetGroupMembersRequest =  RequestMessage<GroupIdPayload>;

export type RegisterRequest =  RequestMessage<RegisterPayload>;

export type RegisterResponse = ResponseMessage<{
  user: User;
}>;

export type LoginResponse = ResponseMessage<{
  user: User;
}>;

export type GetGroupsResponse = ResponseMessage<{
  groups: GroupSummary[];
}>;

export type CreateGroupResponse = ResponseMessage<{
  group: Group;
}>;

export type GetMessagesResponse = ResponseMessage<{
  messages: ChatMessage[];
  hasMore: boolean;
}>;

export type SendMessageResponse = ResponseMessage<{
  messageId: number;
}>;

export type GetGroupMembersResponse =
  ResponseMessage<{
    members: GroupMember[];
  }>;

export type NewMessageEvent = EventMessage<{
  message: ChatMessage;
}>;

export type GroupDeletedEvent = EventMessage<{
  groupId: number;
}>;

export type MemberRemovedEvent = EventMessage<{
  groupId: number;
  userId: number;
}>;

export type ProtocolMessage =
  | RequestMessage
  | ResponseMessage
  | EventMessage
  | ErrorMessage
  | ControlMessage;