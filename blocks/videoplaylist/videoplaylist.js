export default async function decorate(block) {
 const rows = [...block.children];
 const videoSlides = [];
 rows.forEach(row => {
    const linkElement = row.querySelector('a');
    const placeholderElement = row.querySelector('picture');
    videoSlides.push({
      link: linkElement ? linkElement.href : '',
      placeholder: placeholderElement || null,
    });
 });

 console.log(videoSlides);
 block.textContent = '';
 block.dataset.embedLoaded = false;
}