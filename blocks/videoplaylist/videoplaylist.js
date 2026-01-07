import decorate from '../video/video.js'; // Import existing Video block logic

export default async function decorate(block) {
  // Universal Editor injects the model into block.model
  const { container } = block.model; // Array of video entries from EDS

  // Clear the playlist block
  block.textContent = '';
  block.classList.add('video-playlist');

  // Loop through each video entry
  container.forEach(entry => {
    // Create a new Video block container
    const videoBlock = document.createElement('div');
    videoBlock.className = 'video'; // Important: matches Video block selector

    // Simulate the structure expected by video.js
    const row = document.createElement('div');
    const cell = document.createElement('div');

    // Add video URL as a link
    const link = document.createElement('a');
    link.href = entry.videoUrl;
    link.textContent = entry.videoUrl;
    cell.appendChild(link);

    // Add placeholder image if available
    if (entry.placeholder1) {
      const img = document.createElement('img');
      img.src = entry.placeholder1;
      cell.appendChild(img);
    }

    row.appendChild(cell);
    videoBlock.appendChild(row);

    // Append to playlist container
    block.appendChild(videoBlock);

    // Call existing Video block logic
    decorate(videoBlock);
  });
}
