import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { clearToasts, dismissToast, getToasts, subscribeToasts, toast } from "../src/utils/toast";

beforeEach(() => clearToasts());

test("shows success and error toasts and notifies subscribers", () => {
  let calls = 0;
  const unsubscribe = subscribeToasts(() => calls++);
  toast.success("Profile saved.");
  toast.error("Couldn't save.");
  assert.deepEqual(
    getToasts().map(item => [item.type, item.message]),
    [
      ["success", "Profile saved."],
      ["error", "Couldn't save."],
    ],
  );
  assert.equal(calls, 2);
  unsubscribe();
});

test("keeps at most three toasts and can dismiss one", () => {
  const ids = ["a", "b", "c", "d"].map(message => toast.info(message));
  assert.deepEqual(
    getToasts().map(item => item.message),
    ["b", "c", "d"],
  );
  dismissToast(ids[2]);
  assert.deepEqual(
    getToasts().map(item => item.message),
    ["b", "d"],
  );
});

test("clearToasts removes everything, e.g. on logout", () => {
  toast.success("x");
  clearToasts();
  assert.equal(getToasts().length, 0);
});

test("a success toast replaces earlier error toasts", () => {
  toast.error("Please fix the highlighted fields.");
  toast.success("Profile saved.");
  assert.deepEqual(
    getToasts().map(item => item.message),
    ["Profile saved."],
  );
});
