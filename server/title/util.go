package title

import (
	"io/ioutil"
	"path/filepath"
	"strings"

	"golang.org/x/text/language"
	"golang.org/x/text/language/display"
	"golang.org/x/text/message"

	"github.com/loctools/title-server/config"
)

// Entry defines the information about the project
// files.
type Entry struct {
	Lang     string
	LangName string
	SubDir   string
	SrcLang  string
}

// GatherLanguageFiles gathers all timed text file data.
func GatherLanguageFiles(projectDir string) ([]*Entry, error) {
	subdirs, err := ioutil.ReadDir(projectDir)
	if err != nil {
		return nil, err
	}

	entries := make([]*Entry, 0)

	for _, subdir := range subdirs {
		if !subdir.IsDir() {
			continue
		}

		fullSubdirPath := filepath.Join(projectDir, subdir.Name())

		files, err := ioutil.ReadDir(fullSubdirPath)
		if err != nil {
			return nil, err
		}

		for _, f := range files {
			if f.IsDir() {
				continue
			}
			if !strings.HasSuffix(f.Name(), LocJSONExt) {
				continue
			}

			lang := GetFilenameSansExt(f.Name())
			langName := ""
			if val, ok := config.CFG.LanguageNames[lang]; ok {
				langName = val
			} else {
				if val, ok := config.CFG.LanguageAliases[lang]; ok {
					lang = val
				}
				lang := language.Make(lang)
				p := message.NewPrinter(language.English)
				langName = p.Sprintf("%v", display.Language(lang))
			}

			entries = append(entries, &Entry{
				Lang:     lang,
				LangName: langName,
				SubDir:   subdir.Name(),
				SrcLang:  GetFilenameSansExt(subdir.Name()),
			})
		}
	}

	return entries, nil
}

// GetFilenameSansExt is an utility function
// that returns the file name with its extension trimmed.
func GetFilenameSansExt(filename string) string {
	ext := filepath.Ext(filename)
	return strings.TrimSuffix(filename, ext)
}
