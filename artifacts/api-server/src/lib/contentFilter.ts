const BAD_PATTERNS = [
  /\b(fuck|shit|ass|bitch|cunt|dick|pussy|nigger|faggot)\b/gi,
  /https?:\/\/[^\s]+\.(exe|bat|sh|ps1|cmd|msi)/gi,
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
];

export function filterContent(input: string): string {
  let out = input;
  for (const pattern of BAD_PATTERNS) {
    out = out.replace(pattern, "[removed]");
  }
  return out;
}
