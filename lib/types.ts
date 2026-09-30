// Shared API types. Generated from ../schema.yml into lib/api-schema.ts by `npm run gen:api`;
// re-exported here under friendlier names.
import type { components } from "./api-schema";

type Schemas = components["schemas"];

export type User = Schemas["User"];
export type TokenPair = Schemas["TokenPair"];
export type AuthResponse = Schemas["AuthResponse"];
export type RegisterRequest = Schemas["RegisterRequest"];
export type RegisterResponse = Schemas["RegisterResponse"];
export type LoginRequest = Schemas["LoginRequest"];
export type PasswordResetConfirmRequest = Schemas["PasswordResetConfirmRequest"];
export type Detail = Schemas["Detail"];

/** Body of every API error: `{detail, code}`, plus `fields` on validation errors. */
export type ApiErrorBody = Schemas["Error"];

export type Room = Schemas["Room"];
export type LiveActivitySummary = Schemas["LiveActivitySummary"];
export type RoomCreateRequest = Schemas["RoomCreateRequest"];
export type RoomUpdateRequest = Schemas["PatchedRoomUpdateRequest"];

export type PublicRoom = Schemas["PublicRoom"];

export type Quiz = Schemas["Quiz"];
export type QuizListItem = Schemas["QuizListItem"];
export type QuizQuestion = Schemas["QuizQuestion"];
export type QuizWriteRequest = Schemas["QuizWriteRequest"];
export type QuizQuestionWriteRequest = Schemas["QuizQuestionWriteRequest"];

export type Activity = Schemas["Activity"];
export type ActivityMode = Schemas["ActivityModeEnum"];
export type QuestionType = Schemas["QuestionTypeEnum"];
export type QuickQuestionRequest = Schemas["QuickQuestionRequest"];
export type TeacherState = Schemas["TeacherState"];
export type TeacherQuestion = Schemas["TeacherQuestion"];
export type TeacherParticipant = Schemas["TeacherParticipant"];
export type TeacherResponse = Schemas["TeacherResponse"];
export type QuestionSummary = Schemas["QuestionSummary"];

export type Report = Schemas["Report"];
export type ReportRoom = Schemas["ReportRoom"];

export type JoinResult = Schemas["JoinResult"];
export type StudentActivity = Schemas["StudentActivity"];
export type StudentQuestion = Schemas["StudentQuestion"];
export type StudentResponse = Schemas["StudentResponse"];
export type Feedback = Schemas["Feedback"];
export type ParticipantState = Schemas["ParticipantState"];

/** A student's answer: MC/TF send the choice index, SA the text. */
export type Answer = { choice_index: number } | { text_answer: string };

// WebSocket messages (docs/api/websocket.md). Events are notifications only: each says
// "activity X changed, it is now at `version`", and the data comes from the state endpoints.

type WsEventBase = { activity_id: number; version: number };

/** Events on the student socket, `/ws/room/{code}/`. */
export type StudentEvent =
  | ({ type: "activity_started" } & WsEventBase)
  | ({ type: "activity_updated" } & WsEventBase)
  | ({ type: "activity_ended" } & WsEventBase)
  | ({ type: "participant_removed"; participant_id: string } & WsEventBase);

/** Events on the teacher socket, `/ws/teacher/room/{room_id}/`. */
export type TeacherEvent =
  | ({ type: "participants_changed" } & WsEventBase)
  | ({ type: "responses_updated" } & WsEventBase)
  | ({ type: "activity_updated" } & WsEventBase);

export type RoomEvent = StudentEvent | TeacherEvent;

/** Everything the server sends: an event, or the reply to our ping. */
export type ServerMessage = RoomEvent | { type: "pong" };

/** The only thing a client ever sends. */
export type ClientMessage = { type: "ping" };

/** Close codes the server uses to reject a socket. Anything else means "reconnect". */
export const CLOSE_UNAUTHORIZED = 4401;
export const CLOSE_NOT_FOUND = 4404;

/**
 * - `connecting`: first connection attempt, nothing known yet.
 * - `live`: socket open.
 * - `reconnecting`: lost the socket and retrying (polling while it's down).
 * - `not_found`: the server said the room doesn't exist (4404); no more retries.
 */
export type ConnectionStatus = "connecting" | "live" | "reconnecting" | "not_found";
