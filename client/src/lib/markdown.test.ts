import { describe, expect, it } from "vitest";
import { countHeadings, looksLikeMarkdown, markdownToPlainText, splitByHeadings } from "./markdown";

describe("looksLikeMarkdown", () => {
  it("returns false for empty text", () => {
    expect(looksLikeMarkdown("")).toBe(false);
    expect(looksLikeMarkdown("   ")).toBe(false);
  });

  it("returns false for plain prose", () => {
    expect(looksLikeMarkdown("This is just a normal sentence about a server outage.")).toBe(false);
  });

  it("returns true for headings plus a list", () => {
    const text = "# Title\n\n- one\n- two\n";
    expect(looksLikeMarkdown(text)).toBe(true);
  });

  it("returns true for bold text plus a link", () => {
    const text = "Check out **this** for more: [details](https://example.com)";
    expect(looksLikeMarkdown(text)).toBe(true);
  });

  it("returns false for a single incidental marker", () => {
    const text = "It costs $5 * 2 for the pack, nothing fancy about it at all really.";
    expect(looksLikeMarkdown(text)).toBe(false);
  });

  it("returns true for headings alone, with no other markdown signals", () => {
    const text = "# Intro\nHello.\n\n# Details\nMore info.";
    expect(looksLikeMarkdown(text)).toBe(true);
  });

  it("returns true for a fenced code block alone", () => {
    const text = "```\nconst x = 1;\n```";
    expect(looksLikeMarkdown(text)).toBe(true);
  });
});

describe("markdownToPlainText", () => {
  it("strips headings, emphasis, links, lists, and blockquotes to plain prose", () => {
    const markdown = [
      "# Heading One",
      "",
      "Some **bold text** and a [link](https://example.com) and `inline code`.",
      "",
      "- item one",
      "- item two",
      "",
      "> a quote",
    ].join("\n");

    const plain = markdownToPlainText(markdown);

    expect(plain).toContain("Heading One");
    expect(plain).toContain("Some bold text and a link and inline code.");
    expect(plain).toContain("item one");
    expect(plain).toContain("item two");
    expect(plain).toContain("a quote");
    expect(plain).not.toContain("#");
    expect(plain).not.toContain("**");
    expect(plain).not.toContain("[link]");
    expect(plain).not.toContain("`");
    expect(plain).not.toContain(">");
  });
});

describe("countHeadings", () => {
  it("counts heading lines at any level", () => {
    expect(countHeadings("# One\n## Two\ntext\n### Three")).toBe(3);
  });

  it("returns 0 when there are no headings", () => {
    expect(countHeadings("just some text")).toBe(0);
  });
});

describe("splitByHeadings", () => {
  it("splits into one section per heading, each including its heading line", () => {
    const text = "# Intro\nHello there.\n\n# Details\nMore info here.";
    const sections = splitByHeadings(text);

    expect(sections).toHaveLength(2);
    expect(sections[0].heading).toBe("Intro");
    expect(sections[0].content).toContain("# Intro");
    expect(sections[0].content).toContain("Hello there.");
    expect(sections[1].heading).toBe("Details");
    expect(sections[1].content).toContain("More info here.");
  });

  it("keeps content before the first heading as its own section with no heading", () => {
    const text = "Preamble text.\n\n# First\nBody.";
    const sections = splitByHeadings(text);

    expect(sections).toHaveLength(2);
    expect(sections[0].heading).toBe("");
    expect(sections[0].content).toBe("Preamble text.");
  });

  it("returns a single section when there are no headings", () => {
    const sections = splitByHeadings("Just plain text, no headings at all.");
    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBe("");
  });
});
