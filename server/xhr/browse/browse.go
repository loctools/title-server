package browse

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"

	"github.com/loctools/title-server/config"
	"github.com/loctools/title-server/title"
	"github.com/loctools/title-server/validator"
)

// Entry defines a single file/folder entry
// in the response
type Entry struct {
	Name  string `json:"name"`
	Path  string `json:"path"`
	IsDir bool   `json:"dir"`
}

// Response defines the response payload
type Response struct {
	Path    string   `json:"path"`
	Entries []*Entry `json:"entries"`
}

// ReadDirectory handles XHR requests from the browse page
// and returns a list of files to render
func ReadDirectory(path string) ([]byte, error) {
	err := validator.CheckIsValidPath(path)
	if err != nil {
		return nil, err
	}

	log.Printf("[Browser] Path: %s\n", path)

	dir := config.CFG.DataRoot + path
	log.Printf("[Browser] Directory: %s\n", dir)

	files, err := ioutil.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	entries := make([]*Entry, 0, len(files))

	hasTitleProjects := false
	for _, f := range files {
		filename := f.Name()

		if f.IsDir() && filename == title.ProjectFolderName {
			hasTitleProjects = true
			continue
		}

		if filename[0] == '.' {
			continue
		}

		f, err := followSymlink(dir, f)
		if err != nil {
			log.Printf("%s: followSymlink error: %s", filename, err.Error())
			continue
		}

		isDir := f.IsDir()

		if !isDir {
			continue
		}

		entries = append(entries, &Entry{
			Name:  filename,
			Path:  filename,
			IsDir: true,
		})
	}

	if hasTitleProjects {
		langEntries, err := title.GatherLanguageFiles(filepath.Join(dir, title.ProjectFolderName))
		if err != nil {
			return nil, err
		}

		for _, e := range langEntries {
			entries = append(entries, &Entry{
				Name:  fmt.Sprintf("%s (%s)", e.Lang, e.LangName),
				Path:  e.Lang,
				IsDir: false,
			})
		}
	}

	response := &Response{
		Path:    path,
		Entries: entries,
	}
	bytes, err := json.Marshal(response)
	if err != nil {
		return nil, err
	}

	return bytes, nil
}

func followSymlink(baseDir string, f os.FileInfo) (os.FileInfo, error) {
	if (f.Mode() & os.ModeSymlink) != 0 {
		path, err := os.Readlink(baseDir + "/" + f.Name())
		if err != nil {
			return nil, err
		}
		symlinked, err := os.Lstat(path)
		if err != nil {
			return nil, err
		}
		return symlinked, nil
	}

	return f, nil
}
