package main

import (
	"log"
	"net/http"
	"strings"

	"github.com/loctools/title-server/config"
	"github.com/loctools/title-server/raw"
	"github.com/loctools/title-server/xhr/browse"
	"github.com/loctools/title-server/xhr/streaminfo"
	"github.com/loctools/title-server/xhr/view"
)

func main() {
	config.Load()

	http.Handle("/", http.FileServer(http.Dir("../webroot")))
	http.HandleFunc("/xhr/browse/", browseDirectory)
	http.HandleFunc("/xhr/view/", getViewData)
	http.HandleFunc("/xhr/streaminfo/", getStreamInfo)
	http.HandleFunc("/raw/", sendRawFile)

	//fmt.Printf("%+v", config.CFG)

	log.Printf("Listening on %s\n", config.CFG.ListenAddress)
	log.Printf("Root folder: %s\n", config.CFG.DataRoot)
	log.Fatal(http.ListenAndServe(config.CFG.ListenAddress, nil))
}

//  URL must be in the following form:
//  `/xhr/browse/<path-to-directory>`
func browseDirectory(w http.ResponseWriter, r *http.Request) {
	relPath := strings.TrimPrefix(r.URL.Path, "/xhr/browse")

	bytes, err := browse.ReadDirectory(relPath)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	w.Write(bytes)
}

//  URL must be in the following form:
//  `/xhr/metadata/<path-to-file>`
func getViewData(w http.ResponseWriter, r *http.Request) {
	relPath := strings.TrimPrefix(r.URL.Path, "/xhr/view")

	bytes, err := view.GetData(config.CFG.DataRoot, relPath, config.CFG.Secret)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	w.Write(bytes)
}

//  URL must be in the following form:
//  `/xhr/streaminfo/<platform>/<video-id>/<signature>`
func getStreamInfo(w http.ResponseWriter, r *http.Request) {
	relPath := strings.TrimPrefix(r.URL.Path, "/xhr/streaminfo/")
	parts := strings.SplitN(relPath, "/", 3)

	bytes, err := streaminfo.GetInfo(parts[0], parts[1], parts[2], config.CFG.Secret)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	w.Write(bytes)
}

//  URL must be in the following form:
//  `/raw/<path-to-project>/<subdir>/<lang>/<type>`
func sendRawFile(w http.ResponseWriter, r *http.Request) {
	relPath := strings.TrimPrefix(r.URL.Path, "/raw")

	err := raw.SendFile(w, relPath)
	if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusBadRequest)
	}
}
