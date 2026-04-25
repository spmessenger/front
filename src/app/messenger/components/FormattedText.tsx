import React from "react";

type FormattedTextProps = {
  text: string;
  className?: string;
  style?: React.CSSProperties;
};

const TELEGRAM_ESCAPABLE_CHARS = /\\([_*[\]()~`>#+\-=|{}.!\\])/g;
const PLAIN_URL_REGEX = /(https?:\/\/[^\s<]+)/g;

function isEscaped(source: string, index: number): boolean {
  let slashCount = 0;
  let cursor = index - 1;
  while (cursor >= 0 && source[cursor] === "\\") {
    slashCount += 1;
    cursor -= 1;
  }
  return slashCount % 2 === 1;
}

function findUnescaped(source: string, token: string, start: number): number {
  const tokenLength = token.length;
  for (let index = start; index <= source.length - tokenLength; index += 1) {
    if (source.startsWith(token, index) && !isEscaped(source, index)) {
      return index;
    }
  }
  return -1;
}

function unescapeTelegramText(source: string): string {
  return source.replace(TELEGRAM_ESCAPABLE_CHARS, "$1");
}

function isSafeUrl(raw: string): boolean {
  try {
    const normalized = raw.trim();
    const parsed = new URL(normalized);
    return ["http:", "https:", "mailto:", "tg:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function renderPlainTextWithLinks(source: string, keyPrefix: string): React.ReactNode[] {
  const cleanText = unescapeTelegramText(source);
  if (!cleanText) {
    return [];
  }

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = PLAIN_URL_REGEX.exec(cleanText);
  let keyIndex = 0;

  while (match) {
    const matchedUrl = match[0];
    const matchIndex = match.index;

    if (matchIndex > lastIndex) {
      nodes.push(
        <React.Fragment key={`${keyPrefix}-plain-${keyIndex}`}>
          {cleanText.slice(lastIndex, matchIndex)}
        </React.Fragment>,
      );
      keyIndex += 1;
    }

    if (isSafeUrl(matchedUrl)) {
      nodes.push(
        <a
          key={`${keyPrefix}-url-${keyIndex}`}
          href={matchedUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {matchedUrl}
        </a>,
      );
    } else {
      nodes.push(
        <React.Fragment key={`${keyPrefix}-unsafe-url-${keyIndex}`}>
          {matchedUrl}
        </React.Fragment>,
      );
    }

    keyIndex += 1;
    lastIndex = matchIndex + matchedUrl.length;
    match = PLAIN_URL_REGEX.exec(cleanText);
  }

  if (lastIndex < cleanText.length) {
    nodes.push(
      <React.Fragment key={`${keyPrefix}-tail`}>
        {cleanText.slice(lastIndex)}
      </React.Fragment>,
    );
  }

  return nodes;
}

function parseTelegramInline(source: string, keyPrefix: string, depth: number): React.ReactNode[] {
  if (!source) {
    return [];
  }
  if (depth > 12) {
    return renderPlainTextWithLinks(source, `${keyPrefix}-max-depth`);
  }

  const nodes: React.ReactNode[] = [];
  let index = 0;
  let plainStart = 0;
  let keyIndex = 0;

  const pushPlainUntil = (end: number) => {
    if (end <= plainStart) {
      return;
    }
    const plainChunk = source.slice(plainStart, end);
    const rendered = renderPlainTextWithLinks(plainChunk, `${keyPrefix}-plain-${keyIndex}`);
    rendered.forEach((node, renderedIndex) => {
      nodes.push(
        <React.Fragment key={`${keyPrefix}-plain-wrap-${keyIndex}-${renderedIndex}`}>
          {node}
        </React.Fragment>,
      );
    });
    keyIndex += 1;
  };

  while (index < source.length) {
    if (source[index] === "\\" && index + 1 < source.length) {
      index += 2;
      continue;
    }

    if (source.startsWith("```", index) && !isEscaped(source, index)) {
      const closeIndex = findUnescaped(source, "```", index + 3);
      if (closeIndex !== -1) {
        pushPlainUntil(index);
        const rawBlock = source.slice(index + 3, closeIndex);
        const firstNewLineIndex = rawBlock.indexOf("\n");
        const maybeLang = firstNewLineIndex > -1 ? rawBlock.slice(0, firstNewLineIndex).trim() : "";
        const isLanguageHeader = /^[A-Za-z0-9_+-]{1,32}$/.test(maybeLang);
        const codeText = isLanguageHeader
          ? rawBlock.slice(firstNewLineIndex + 1)
          : rawBlock;
        nodes.push(
          <span
            key={`${keyPrefix}-code-block-${keyIndex}`}
            style={{
              display: "block",
              whiteSpace: "pre-wrap",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            <code>{codeText}</code>
          </span>,
        );
        keyIndex += 1;
        index = closeIndex + 3;
        plainStart = index;
        continue;
      }
    }

    if (source[index] === "[" && !isEscaped(source, index)) {
      const closeBracketIndex = findUnescaped(source, "]", index + 1);
      if (
        closeBracketIndex !== -1 &&
        source[closeBracketIndex + 1] === "(" &&
        !isEscaped(source, closeBracketIndex + 1)
      ) {
        const closeParenIndex = findUnescaped(source, ")", closeBracketIndex + 2);
        if (closeParenIndex !== -1) {
          const label = source.slice(index + 1, closeBracketIndex);
          const href = unescapeTelegramText(
            source.slice(closeBracketIndex + 2, closeParenIndex),
          );

          if (isSafeUrl(href)) {
            pushPlainUntil(index);
            nodes.push(
              <a
                key={`${keyPrefix}-link-${keyIndex}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {parseTelegramInline(label, `${keyPrefix}-link-label-${keyIndex}`, depth + 1)}
              </a>,
            );
            keyIndex += 1;
            index = closeParenIndex + 1;
            plainStart = index;
            continue;
          }
        }
      }
    }

    const applyWrapped = (
      token: string,
      wrap: (children: React.ReactNode[], wrapKey: string) => React.ReactNode,
    ): boolean => {
      if (!source.startsWith(token, index) || isEscaped(source, index)) {
        return false;
      }
      const closeIndex = findUnescaped(source, token, index + token.length);
      if (closeIndex === -1) {
        return false;
      }

      const rawInner = source.slice(index + token.length, closeIndex);
      pushPlainUntil(index);
      nodes.push(
        <React.Fragment key={`${keyPrefix}-${token}-wrapper-${keyIndex}`}>
          {wrap(
            parseTelegramInline(rawInner, `${keyPrefix}-${token}-inner-${keyIndex}`, depth + 1),
            `${keyPrefix}-${token}-node-${keyIndex}`,
          )}
        </React.Fragment>,
      );
      keyIndex += 1;
      index = closeIndex + token.length;
      plainStart = index;
      return true;
    };

    if (
      applyWrapped("||", (children, wrapKey) => (
        <span
          key={wrapKey}
          style={{
            background: "var(--mess-soft-border)",
            borderRadius: "4px",
            padding: "0 4px",
          }}
        >
          {children}
        </span>
      ))
    ) {
      continue;
    }

    if (applyWrapped("__", (children, wrapKey) => <u key={wrapKey}>{children}</u>)) {
      continue;
    }

    if (applyWrapped("*", (children, wrapKey) => <strong key={wrapKey}>{children}</strong>)) {
      continue;
    }

    if (
      source[index] === "_" &&
      source[index + 1] !== "_" &&
      applyWrapped("_", (children, wrapKey) => <em key={wrapKey}>{children}</em>)
    ) {
      continue;
    }

    if (applyWrapped("~", (children, wrapKey) => <s key={wrapKey}>{children}</s>)) {
      continue;
    }

    if (
      applyWrapped("`", (children, wrapKey) => (
        <code
          key={wrapKey}
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          {children}
        </code>
      ))
    ) {
      continue;
    }

    index += 1;
  }

  pushPlainUntil(source.length);
  return nodes;
}

export default function FormattedText({ text, className, style }: FormattedTextProps) {
  const content = React.useMemo(() => parseTelegramInline(text, "telegram", 0), [text]);
  return (
    <span className={className} style={style}>
      {content}
    </span>
  );
}
