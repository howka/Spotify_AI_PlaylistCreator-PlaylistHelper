from playlistSorter import PlaylistSorter

songs = [
    {
        "name": "Zebra",
        "artist": "Artist C",
        "duration": 240000,
        "release_date": "2024-01-01"
    },
    {
        "name": "Apple",
        "artist": "Artist A",
        "duration": 180000,
        "release_date": "2022-01-01"
    },
    {
        "name": "Music",
        "artist": "Artist B",
        "duration": 300000,
        "release_date": "2023-01-01"
    }
]

sorter = PlaylistSorter(songs)

result = sorter.sort("name")

for song in result:
    print(song["name"],song["artist"])
