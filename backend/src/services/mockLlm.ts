import { getHealthData } from "../data/index.js";
import { getDashboard } from "./insights.service.js";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MONTHS: Record<string, string> = { aug: "08", sep: "09", oct: "10" };

// Finds a date like "3 Oct" or "Oct 3" in the question, so mock mode can show a real tool call.
const findDate = (question: string) => {
  const match = /(\d{1,2})\s*(aug|sept?|oct)|(aug|sept?|oct)\w*\s*(\d{1,2})/i.exec(question);
  if (!match) return null;
  const day = (match[1] || match[4]).padStart(2, "0");
  const month = MONTHS[(match[2] || match[3]).toLowerCase().slice(0, 3)];
  return `2026-${month}-${day}`;
};

const OFF_TOPIC = /(code|javascript|python|react|homework|poem|weather|bitcoin|stock|capital of|translate|essay)/i;
const WANTS_CHART = /(this week|chart|trend|over the week)/i;

const buildMockAnswer = async (question: string) => {
  if (OFF_TOPIC.test(question)) {
    return '_(Mock mode)_ I can only help with your health and wellness. Try asking: "How has my sleep been this week?"';
  }

  const dashboard = getDashboard(await getHealthData());
  const goal = (key: string) => dashboard.goalProgress.find(item => item.key === key)!;
  const steps = goal("steps");
  const sleepGoal = goal("sleep");
  const weight = goal("weight");
  const first = dashboard.weekly[0];
  const last = dashboard.weekly[dashboard.weekly.length - 1];

  if (/blood pressure|glucose|medication/i.test(question)) {
    return "Your dashboard doesn't track that, so I can't tell you anything about it.\n\n- I can help with **steps, active minutes, sleep, nutrition and weight**.\n- For medical readings, please check with your doctor.";
  }

  return [
    `_(Mock mode, no real LLM call)_ You're making steady progress, with sleep as the main gap this week.`,
    "",
    `- **Steps:** ${first.avgSteps} a day in week 1, ${last.avgSteps} this week (goal ${steps.target}).`,
    `- **Sleep:** ${sleepGoal.current} h a night this week vs your ${sleepGoal.target} h goal.`,
    `- **Weight:** ${weight.current} kg now, ${weight.detail}.`,
    "",
    "Focus on a regular bedtime on work nights first.",
    "",
    '_Tip: ask about a specific day, like "How did I sleep on 3 Oct?", to see a tool call._',
  ].join("\n");
};

const buildToolAnswer = (toolContent: string) => {
  const result = JSON.parse(toolContent);
  if (result.error) return `_(Mock mode)_ I couldn't find that in your data: ${result.error}`;
  if (result.shown) {
    return "_(Mock mode, chart drawn from your data)_ Your sleep stayed under the 7.5 h goal on most work nights and was better at the weekend. See the chart below.";
  }
  const day = result.days?.[0];
  if (!day || day.note)
    return `_(Mock mode)_ Your device didn't sync any data on ${result.from}, so I can't tell you about that day.`;
  const lines = [
    day.sleepHours !== null && `- **Sleep:** ${day.sleepHours} h`,
    day.steps !== null && `- **Steps:** ${day.steps}`,
    day.restingHeartRate !== null && `- **Resting heart rate:** ${day.restingHeartRate} bpm`,
  ].filter(Boolean);
  return [`_(Mock mode, answer built from a tool result)_ Here's ${day.date}:`, "", ...lines].join("\n");
};

const encoder = new TextEncoder();
const frame = (payload: unknown) => encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);

// Fake OpenAI-compatible endpoint, so mock mode goes through the same stream parser and tool loop as the real one.
export const createMockResponse: typeof fetch = async (_url, init) => {
  const body = JSON.parse(String(init?.body || "{}"));
  const messages = body?.messages || [];
  const lastMessage = messages[messages.length - 1];
  const question = [...messages].reverse().find((message: { role: string }) => message.role === "user")?.content || "";
  const date = findDate(question);
  const signal = init?.signal;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      await sleep(500);
      if (signal?.aborted) return controller.error(new DOMException("Aborted", "AbortError"));

      // Round 1 that needs data: ask for a tool, split into pieces like real providers do.
      const wantsChart = WANTS_CHART.test(question) && !OFF_TOPIC.test(question);
      if ((date || wantsChart) && body.tools && lastMessage?.role === "user") {
        const lastDay = (await getHealthData()).daily.at(-1)!.date;
        const weekAgo = new Date(`${lastDay}T00:00:00Z`);
        weekAgo.setUTCDate(weekAgo.getUTCDate() - 6);
        const name = date ? "get_daily_metrics" : "show_chart";
        const args = JSON.stringify(
          date
            ? { from: date, to: date }
            : { metric: "sleepHours", from: weekAgo.toISOString().slice(0, 10), to: lastDay },
        );
        controller.enqueue(
          frame({
            choices: [
              {
                index: 0,
                delta: {
                  tool_calls: [{ index: 0, id: "call_mock", type: "function", function: { name, arguments: "" } }],
                },
              },
            ],
          }),
        );
        for (const piece of args.match(/.{1,6}/g) || []) {
          controller.enqueue(
            frame({ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: piece } }] } }] }),
          );
        }
        controller.enqueue(frame({ choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }] }));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        return controller.close();
      }

      const text =
        lastMessage?.role === "tool" ? buildToolAnswer(lastMessage.content) : await buildMockAnswer(question);
      for (const word of text.split(/(?<=\s)/)) {
        if (signal?.aborted) return controller.error(new DOMException("Aborted", "AbortError"));
        controller.enqueue(frame({ choices: [{ index: 0, delta: { content: word }, finish_reason: null }] }));
        await sleep(25);
      }
      controller.enqueue(frame({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] }));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
};
