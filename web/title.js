// Keep the original title and identify the Chinese text for font selection
// and screen readers. Either name can wrap on a narrow score page.
export function songTitle({ title, titleZh }) {
  const result = document.createDocumentFragment();
  result.append(title);
  if (titleZh) {
    const chinese = document.createElement("span");
    chinese.lang = "zh-Hans";
    chinese.textContent = titleZh;
    result.append(" ", chinese);
  }
  return result;
}
