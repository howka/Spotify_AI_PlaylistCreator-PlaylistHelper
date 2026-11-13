class PlaylistSorter:
    def __init__(self, songs):
        self.songs = songs

    # Sort songs alphabetically
    def sort_by_name(self):
        return sorted(
            self.songs,
            key=lambda song: song["name"].lower()
        )

    # Sort songs by artist
    def sort_by_artist(self):
        return sorted(
            self.songs,
            key=lambda song: song["artist"].lower()
        )

    # Sort songs by duration
    def sort_by_duration(self):
        return sorted(
            self.songs,
            key=lambda song: song["duration"]
        )

    # Sort songs by release date
    def sort_by_release_date(self):
        return sorted(
            self.songs,
            key=lambda song: song["release_date"]
        )

    # Choose a sorting method
    def sort(self, method):
        if method == "name":
            return self.sort_by_name()

        elif method == "artist":
            return self.sort_by_artist()

        elif method == "duration":
            return self.sort_by_duration()

        elif method == "release_date":
            return self.sort_by_release_date()

        else:
            raise ValueError("Invalid sorting method")