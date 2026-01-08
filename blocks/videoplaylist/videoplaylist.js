export default async function decorate(block) {
  const rows = [...block.children];
  let link = '';
  let placeholder = null;

rows.forEach((row, index) => {
    const cells = [...row.children];
    if (cells.length === 0) return;

    const cell = cells[0];
    const cellContent = cell.textContent.trim();
    console.log(cellContent);
  });
}
