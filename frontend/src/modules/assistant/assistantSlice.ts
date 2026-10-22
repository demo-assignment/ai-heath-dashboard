import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AnswerMeta, ChartBlock, ChatError, ChatMessage } from "@/types/chat";
import type { ConversationSummary } from "@/services/conversation.service";

interface AssistantState {
  isOpen: boolean;
  isStreaming: boolean;
  messages: ChatMessage[];
  activeId: string | null;
  conversations: ConversationSummary[];
  historyStatus: "idle" | "loading" | "error";
  historyError: string;
  activeError: string;
  explicitNew: boolean;
  resetToken: number;
}

const initialState: AssistantState = {
  isOpen: false,
  isStreaming: false,
  messages: [],
  activeId: null,
  conversations: [],
  historyStatus: "idle",
  historyError: "",
  activeError: "",
  explicitNew: false,
  resetToken: 0,
};
const findMessage = (state: AssistantState, id: string) => state.messages.find(message => message.id === id);

const assistantSlice = createSlice({
  name: "assistant",
  initialState,
  reducers: {
    assistantToggled: state => {
      state.isOpen = !state.isOpen;
    },
    assistantClosed: state => {
      state.isOpen = false;
    },
    historyLoading: state => {
      state.historyStatus = "loading";
      state.historyError = "";
    },
    historyLoaded: (state, action: PayloadAction<ConversationSummary[]>) => {
      state.historyStatus = "idle";
      state.historyError = "";
      state.conversations = action.payload;
    },
    historyFailed: (state, action: PayloadAction<string>) => {
      state.historyStatus = "error";
      state.historyError = action.payload;
    },
    conversationSelected: (state, action: PayloadAction<{ id: string; messages: ChatMessage[] }>) => {
      state.activeId = action.payload.id;
      state.messages = action.payload.messages;
      state.activeError = "";
      state.explicitNew = false;
    },
    newConversationSelected: state => {
      state.activeId = null;
      state.messages = [];
      state.activeError = "";
      state.explicitNew = true;
    },
    activeConversationMissing: (state, action: PayloadAction<string>) => {
      state.activeId = null;
      state.messages = [];
      state.isStreaming = false;
      state.activeError = action.payload;
    },
    userMessageAdded: (state, action: PayloadAction<{ id: string; content: string }>) => {
      state.messages.push({ ...action.payload, role: "user", status: "done" });
    },
    answerStarted: (state, action: PayloadAction<{ id: string }>) => {
      state.isStreaming = true;
      state.messages.push({ id: action.payload.id, role: "assistant", content: "", status: "pending" });
    },
    answerChunkReceived: (state, action: PayloadAction<{ id: string; text: string }>) => {
      const message = findMessage(state, action.payload.id);
      if (message) {
        message.content += action.payload.text;
        message.status = "streaming";
        message.statusText = undefined;
      }
    },
    answerStatusChanged: (state, action: PayloadAction<{ id: string; label: string }>) => {
      const message = findMessage(state, action.payload.id);
      if (message) message.statusText = action.payload.label;
    },
    answerChartReceived: (state, action: PayloadAction<{ id: string; chart: ChartBlock }>) => {
      const message = findMessage(state, action.payload.id);
      if (message) message.charts = [...(message.charts || []), action.payload.chart];
    },
    answerMetaReceived: (state, action: PayloadAction<{ id: string; meta: AnswerMeta }>) => {
      const message = findMessage(state, action.payload.id);
      if (message) message.meta = action.payload.meta;
    },
    answerFinished: (state, action: PayloadAction<{ id: string }>) => {
      state.isStreaming = false;
      const message = findMessage(state, action.payload.id);
      if (message) {
        message.status = "done";
        message.statusText = undefined;
      }
    },
    answerStopped: (state, action: PayloadAction<{ id: string }>) => {
      state.isStreaming = false;
      const message = findMessage(state, action.payload.id);
      if (message) message.status = "stopped";
    },
    answerFailed: (state, action: PayloadAction<{ id: string; error: ChatError }>) => {
      state.isStreaming = false;
      const message = findMessage(state, action.payload.id);
      if (message) {
        message.status = "error";
        message.error = action.payload.error;
      }
    },
    answerRemoved: (state, action: PayloadAction<{ id: string }>) => {
      state.messages = state.messages.filter(message => message.id !== action.payload.id);
    },
    conversationCleared: state => ({ ...initialState, resetToken: state.resetToken + 1 }),
  },
});
export const {
  assistantToggled,
  assistantClosed,
  historyLoading,
  historyLoaded,
  historyFailed,
  conversationSelected,
  newConversationSelected,
  activeConversationMissing,
  userMessageAdded,
  answerStarted,
  answerChunkReceived,
  answerStatusChanged,
  answerChartReceived,
  answerMetaReceived,
  answerFinished,
  answerStopped,
  answerFailed,
  answerRemoved,
  conversationCleared,
} = assistantSlice.actions;
export default assistantSlice.reducer;
