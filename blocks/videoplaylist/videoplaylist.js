export default async function decorate(block) {
  const link = block.children[0].querySelector("a");
  const image = block.children[0].querySelector("picture");
  const rows = [...block.children];
  rows.forEach((row, index) => {
    const cells = [...row.children];
    if (cells.length === 0) return;
    const cell = cells[0];
    console.log(index + "" +cell);
  });
}
