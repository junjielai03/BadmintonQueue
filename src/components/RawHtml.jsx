export default function RawHtml({ html, as: Tag = 'span', ...rest }) {
  return <Tag {...rest} dangerouslySetInnerHTML={{ __html: html }} />;
}
