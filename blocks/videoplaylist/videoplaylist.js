export default async function decorate(block) {
  const rows = [...block.children];
  rows.forEach((row, index) => {
    const cells = [...row.children];
    if (cells.length === 0) return;
    const cell = cells[index];
    const cellContent = cell.textContent.trim();
    console.log(cellContent);
  });
}
