export default async function decorate(block) {
 const rows = [...block.children];
 rows.forEach(row => {
    const cells = [...row.children];
    if (cells.length === 0) return;

    const cell = cells[0];
    const cellContent = cell.textContent.trim();
    const linkElement = cell.querySelector('a');
    const pictureElement = cell.querySelector('picture');
    console.log(cellContent,linkElement,pictureElement);
 });
}