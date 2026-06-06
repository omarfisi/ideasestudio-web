import { useState } from "react";

function FaqItem({ question, answer, open, onToggle }) {
  return (
    <div className="rounded-[1.25rem] border border-neutral-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="pr-4 text-sm font-semibold text-neutral-950">{question}</span>
        <span className="shrink-0 text-neutral-400">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="border-t border-neutral-100 px-5 pb-4 pt-3">
          <p className="whitespace-pre-line text-sm leading-6 text-neutral-700">{answer}</p>
        </div>
      ) : null}
    </div>
  );
}

export default function FaqBlock({ settings = {} }) {
  const { title, items } = settings;
  const list = Array.isArray(items) ? items.filter((i) => i?.question) : [];
  const [openIndex, setOpenIndex] = useState(null);

  if (!list.length) return null;

  return (
    <div>
      {title ? (
        <h3 className="mb-4 text-lg font-semibold text-neutral-950">{title}</h3>
      ) : null}
      <div className="space-y-2">
        {list.map((item, index) => (
          <FaqItem
            key={index}
            question={item.question}
            answer={item.answer}
            open={openIndex === index}
            onToggle={() => setOpenIndex(openIndex === index ? null : index)}
          />
        ))}
      </div>
    </div>
  );
}
