import { sortPlaylist } from "./backendApi.js";

const sortMethod = document.getElementById("sortMethod");
const previewButton = document.getElementById("previewSort");
const sortingPreview = document.getElementById("sortingPreview");

// Temporary sample songs for testing
const sampleSongs = [
    {
        name: "Zebra",
        artist: "Artist C",
        duration: 240000,
        release_date: "2024-01-01"
    },
    {
        name: "Apple",
        artist: "Artist A",
        duration: 180000,
        release_date: "2022-01-01"
    },
    {
        name: "Music",
        artist: "Artist B",
        duration: 300000,
        release_date: "2023-01-01"
    }
];
let currentPlaylist = null;

window.addEventListener("playlistSelected", (event) => {
    currentPlaylist = event.detail;

    console.log("Playlist selected for sorting:", currentPlaylist);

    // Clear the previous sorting preview
    sortingPreview.replaceChildren();
});
window.addEventListener("playlistDisconnected", () => {
    currentPlaylist = null;
    sortingPreview.replaceChildren();
});

previewButton.addEventListener("click", async () => {
    previewButton.disabled = true;
    sortingPreview.textContent = "Sorting songs...";

    if (!currentPlaylist) {
        sortingPreview.textContent = "Please select a playlist first.";
        return;
    }

    try {
        const result = await sortPlaylist(
            sampleSongs,
            sortMethod.value
        );

        sortingPreview.replaceChildren();

        const comparison = document.createElement("div");
        comparison.classList.add("sortingComparison");

        const originalColumn = document.createElement("div");
        const sortedColumn = document.createElement("div");

        const originalTitle = document.createElement("h4");
        originalTitle.textContent = "Original Order";

        const sortedTitle = document.createElement("h4");
        sortedTitle.textContent = "Sorted Order";

        originalColumn.appendChild(originalTitle);
        sortedColumn.appendChild(sortedTitle);

        // Original songs
        sampleSongs.forEach((song, index) => {
            const div = document.createElement("div");
            div.classList.add("previewSong");
            div.textContent = `${index + 1}. ${song.name}`;
            originalColumn.appendChild(div);
        });

        // Sorted songs
        result.songs.forEach((song, index) => {
            const div = document.createElement("div");
            div.classList.add("previewSong");
            div.textContent = `${index + 1}. ${song.name}`;
            sortedColumn.appendChild(div);
        });

        comparison.appendChild(originalColumn);
        comparison.appendChild(sortedColumn);
        sortingPreview.appendChild(comparison);

    } catch (error) {
        console.error(error);
        sortingPreview.textContent = error.message;

    } finally {
        previewButton.disabled = false;
    }
});