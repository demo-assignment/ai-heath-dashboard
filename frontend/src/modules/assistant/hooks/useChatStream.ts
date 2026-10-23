import { toast } from "@/utils/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { streamChat } from "@/services/chat.service";
import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
} from "@/services/conversation.service";
import { ApiError } from "@/api/client";
import {
  activeConversationMissing,
  answerChartReceived,
  answerChunkReceived,
  answerFailed,
  answerFinished,
  answerMetaReceived,
  answerRemoved,
  answerStarted,
  answerStatusChanged,
  answerStopped,
  conversationSelected,
  historyFailed,
  historyLoaded,
  historyLoading,
  newConversationSelected,
  userMessageAdded,
} from "../assistantSlice";

const createId = () => crypto.randomUUID();

export const useChatStream = () => {
  const dispatch = useAppDispatch();
  const assistant = useAppSelector(state => state.assistant);
  const stateRef = useRef(assistant);
  stateRef.current = assistant;
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(false);
  const lifecycleRef = useRef(0);
  const historyRequestRef = useRef(0);
  const busyRef = useRef(false);
  const [isBusy, setIsBusy] = useState(false);
  const frameRef = useRef<number | null>(null);
  const setBusy = (value: boolean) => {
    busyRef.current = value;
    if (mountedRef.current) setIsBusy(value);
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      lifecycleRef.current += 1;
      controllerRef.current?.abort();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);
  useEffect(() => {
    controllerRef.current?.abort();
  }, [assistant.resetToken]);

  const refreshHistory = useCallback(async () => {
    if (!mountedRef.current) return;
    const token = stateRef.current.resetToken;
    const sequence = ++historyRequestRef.current;
    const lifecycle = lifecycleRef.current;
    const current = () =>
      mountedRef.current &&
      lifecycleRef.current === lifecycle &&
      stateRef.current.resetToken === token &&
      historyRequestRef.current === sequence;
    dispatch(historyLoading());
    try {
      const response = await listConversations();
      if (current()) dispatch(historyLoaded(response.conversations));
    } catch (error) {
      if (current() && !(error instanceof ApiError && error.code === "STALE_REQUEST"))
        dispatch(historyFailed(error instanceof ApiError ? error.message : "Couldn't load your history."));
    }
  }, [dispatch]);

  const selectConversation = useCallback(
    async (id: string) => {
      if (controllerRef.current || busyRef.current) return;
      setBusy(true);
      const token = stateRef.current.resetToken;
      const lifecycle = lifecycleRef.current;
      const current = () =>
        mountedRef.current && lifecycleRef.current === lifecycle && stateRef.current.resetToken === token;
      try {
        const response = await getConversation(id);
        if (current())
          dispatch(conversationSelected({ id: response.conversation.id, messages: response.conversation.messages }));
      } catch (error) {
        if (!current()) return;
        if (error instanceof ApiError && error.status === 404)
          dispatch(
            activeConversationMissing("This conversation is no longer available. Start a new chat to continue."),
          );
        else if (!(error instanceof ApiError && error.code === "STALE_REQUEST"))
          dispatch(historyFailed(error instanceof ApiError ? error.message : "Couldn't open this conversation."));
      } finally {
        if (current()) setBusy(false);
      }
    },
    [dispatch],
  );

  const ask = useCallback(
    async (conversationId: string, question: string, regenerate = false) => {
      const resetToken = stateRef.current.resetToken;
      const lifecycle = lifecycleRef.current;
      const current = () =>
        mountedRef.current && lifecycleRef.current === lifecycle && stateRef.current.resetToken === resetToken;
      const controller = new AbortController();
      controllerRef.current = controller;
      const answerId = createId();
      let pendingText = "";
      const flush = () => {
        frameRef.current = null;
        if (pendingText && current()) dispatch(answerChunkReceived({ id: answerId, text: pendingText }));
        pendingText = "";
      };
      const flushNow = () => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        flush();
      };
      dispatch(answerStarted({ id: answerId }));
      try {
        await streamChat({
          conversationId,
          message: question,
          regenerate,
          signal: controller.signal,
          onEvent: event => {
            if (!current()) return;
            if (event.type === "delta") {
              pendingText += event.text;
              if (!frameRef.current) frameRef.current = requestAnimationFrame(flush);
            }
            if (event.type === "status") {
              flushNow();
              dispatch(answerStatusChanged({ id: answerId, label: event.label }));
            }
            if (event.type === "chart") dispatch(answerChartReceived({ id: answerId, chart: event.chart }));
            if (event.type === "meta") dispatch(answerMetaReceived({ id: answerId, meta: event.meta }));
          },
        });
        flushNow();
        if (current())
          dispatch(controller.signal.aborted ? answerStopped({ id: answerId }) : answerFinished({ id: answerId }));
      } catch (error) {
        flushNow();
        if (!current()) return;
        if (controller.signal.aborted) dispatch(answerStopped({ id: answerId }));
        else if (error instanceof ApiError && error.status === 404)
          dispatch(
            activeConversationMissing("This conversation was deleted or expired. Start a new chat to continue."),
          );
        else {
          const apiError =
            error instanceof ApiError
              ? error
              : new ApiError("Something went wrong. Please try again.", "UNKNOWN", true);
          dispatch(
            answerFailed({
              id: answerId,
              error: { code: apiError.code, message: apiError.message, retryable: apiError.retryable },
            }),
          );
        }
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null;
        if (current()) void refreshHistory();
      }
    },
    [dispatch, refreshHistory],
  );

  const send = useCallback(
    (text: string) => {
      const question = text.trim();
      if (
        !question ||
        controllerRef.current ||
        busyRef.current ||
        stateRef.current.activeError ||
        (stateRef.current.historyStatus === "loading" && !stateRef.current.activeId && !stateRef.current.explicitNew)
      )
        return false;
      setBusy(true);
      void (async () => {
        const token = stateRef.current.resetToken;
        const lifecycle = lifecycleRef.current;
        const current = () =>
          mountedRef.current && lifecycleRef.current === lifecycle && stateRef.current.resetToken === token;
        try {
          let conversationId = stateRef.current.activeId;
          if (!conversationId) {
            const response = await createConversation();
            if (!current()) return;
            conversationId = response.conversation.id;
            dispatch(conversationSelected({ id: conversationId, messages: [] }));
          }
          if (!current()) return;
          dispatch(userMessageAdded({ id: createId(), content: question }));
          // ask assigns its AbortController synchronously before releasing the preparation guard.
          const pending = ask(conversationId, question);
          setBusy(false);
          await pending;
        } catch (error) {
          if (current())
            dispatch(historyFailed(error instanceof ApiError ? error.message : "Couldn't create a conversation."));
        } finally {
          if (current()) setBusy(false);
        }
      })();
      return true;
    },
    [ask, dispatch],
  );

  const retry = useCallback(
    (answerId: string) => {
      if (controllerRef.current || busyRef.current) return;
      const list = stateRef.current.messages;
      const index = list.findIndex(message => message.id === answerId);
      const question = list[index - 1];
      if (
        !stateRef.current.activeId ||
        index !== list.length - 1 ||
        list[index]?.role !== "assistant" ||
        question?.role !== "user"
      )
        return;
      const id = stateRef.current.activeId;
      const token = stateRef.current.resetToken;
      setBusy(true);
      void (async () => {
        try {
          // An HTTP/network failure may have happened before the server saved a turn.
          const response = await getConversation(id);
          if (!mountedRef.current || stateRef.current.resetToken !== token) return;
          const saved = response.conversation.messages;
          const replacesLast =
            saved.length === list.length && saved.at(-2)?.role === "user" && saved.at(-2)?.content === question.content;
          const wasNotSaved = saved.length === list.length - 2;
          if (!replacesLast && !wasNotSaved) {
            dispatch(historyFailed("This conversation changed elsewhere. Reopen it from History before retrying."));
            return;
          }
          dispatch(answerRemoved({ id: answerId }));
          const pending = ask(id, question.content, replacesLast);
          setBusy(false);
          await pending;
        } catch (error) {
          if (!mountedRef.current || stateRef.current.resetToken !== token) return;
          if (error instanceof ApiError && error.status === 404)
            dispatch(
              activeConversationMissing("This conversation is no longer available. Start a new chat to continue."),
            );
          else if (!(error instanceof ApiError && error.code === "STALE_REQUEST"))
            dispatch(historyFailed(error instanceof ApiError ? error.message : "Couldn't retry this answer."));
        } finally {
          if (mountedRef.current && stateRef.current.resetToken === token) setBusy(false);
        }
      })();
    },
    [ask, dispatch],
  );

  const createNew = useCallback(() => {
    if (!controllerRef.current && !busyRef.current) dispatch(newConversationSelected());
  }, [dispatch]);
  const removeConversation = useCallback(
    async (id: string) => {
      if (
        controllerRef.current ||
        busyRef.current ||
        !window.confirm("Delete this conversation? This cannot be undone.")
      )
        return;
      setBusy(true);
      const token = stateRef.current.resetToken;
      try {
        await deleteConversation(id);
        if (!mountedRef.current || stateRef.current.resetToken !== token) return;
        if (stateRef.current.activeId === id) dispatch(newConversationSelected());
        toast.success("Conversation deleted.");
        await refreshHistory();
      } catch (error) {
        if (
          mountedRef.current &&
          stateRef.current.resetToken === token &&
          !(error instanceof ApiError && error.code === "STALE_REQUEST")
        ) {
          const message = error instanceof ApiError ? error.message : "Couldn't delete this conversation.";
          dispatch(historyFailed(message));
          toast.error(message);
        }
      } finally {
        if (mountedRef.current && stateRef.current.resetToken === token) setBusy(false);
      }
    },
    [dispatch, refreshHistory],
  );

  return {
    ...assistant,
    isBusy,
    send,
    stop: () => controllerRef.current?.abort(),
    retry,
    refreshHistory,
    selectConversation,
    createNew,
    removeConversation,
  };
};
