class VideoMediaPlayer {
    constructor({ manifestJSON, network, videoComponent }) {
        this.manifestJSON = manifestJSON
        this.network = network
        this.videoComponent = videoComponent

        this.videoElement = null
        this.sourceBuffer = null 
        this.activeItem = {}
        this.selected = {}
        this.videoDuration = 0
        this.selections = []
    }

    initializeCodec() {
        this.videoElement = document.getElementById("vid")
        const mediaSourceSupported = !!window.MediaSource
        if(!mediaSourceSupported) {
            alert('Seu browser ou sistema nao tem suporte a MSE!')
            return;
        }

        const codecSupported = MediaSource.isTypeSupported(this.manifestJSON.codec)
        if(!codecSupported) {
            alert(`Seu browser nao suporta o codec: ${this.manifestJSON.codec}`)
            return;
        }

        const mediaSource = new MediaSource()
        this.videoElement.src = URL.createObjectURL(mediaSource)

        mediaSource.addEventListener("sourceopen", this.sourceOpenWrapper(mediaSource))
    }

    sourceOpenWrapper(mediaSource) {
        return async(_) => {
            this.sourceBuffer = mediaSource.addSourceBuffer(this.manifestJSON.codec)
            const selected = this.selected = this.manifestJSON.intro
            // evita rodar como "LIVE"
            mediaSource.duration = this.videoDuration
            await this.fileDownload(selected.url)
            setInterval(this.waitForQuestions.bind(this), 200)
        }
    }

    waitForQuestions() {
        const currentTime = parseInt(this.videoElement.currentTime)
        const option = this.selected.at === currentTime
        if(!option) return;
        
        // evita que o modal seja aberto 2x no mesmo segundo
        if(this.activeItem.url === this.selected.url) return;
        this.videoComponent.configureModal(this.selected.options)
        this.activeItem = this.selected
    }
    async currentFileResolution() {
        const LOWEST_RESOLUTION = 144
        const prepareUrl = {
            url: this.manifestJSON.finalizar.url,
            fileResolution: LOWEST_RESOLUTION,
            fileResolutionTag: this.manifestJSON.fileResolutionTag,
            hostTag: this.manifestJSON.hostTag,
        }
        const url = this.network.parseManifestURL(prepareUrl)
        return this.network.getProperResolution(url)
    }
    async nextChunk(data) {
        const key = data.toLowerCase()
        const selected = this.manifestJSON[key]
        this.selected = {
            ...selected,
            // ajusta o tempo que o modal vai aparecer, baseado no tempo corrente
            at: parseInt(this.videoElement.currentTime + selected.at)
        } 
        this.manageLag(this.selected)
        // deixa o restante do video rodar enquanto baixa o novo video
        this.videoElement.play()
        await this.fileDownload(selected.url)

    }
    manageLag(selected) {
        if(!!~this.selections.indexOf(selected.url)) {
            selected.at += 5
            return;
        }

        this.selections.push(selected.url)
    }
    async fileDownload(url) {
        const fileResolution = await this.currentFileResolution()
        console.log('currentResolution', fileResolution)
        const prepareUrl = {
            url,
            fileResolution,
            fileResolutionTag: this.manifestJSON.fileResolutionTag,
            hostTag: this.manifestJSON.hostTag
        }
        const finalUrl = this.network.parseManifestURL(prepareUrl)
        this.setVideoPlayerDuration(finalUrl)
        const data = await this.network.fetchFile(finalUrl)
        return this.processBufferSegments(data)
    }

    setVideoPlayerDuration(finalURL) {
        const bars = finalURL.split('/')
        const [ name, videoDuration] = bars[bars.length - 1].split('-')
        this.videoDuration += parseFloat(videoDuration)
    }

    async processBufferSegments(allSegments) {
        const sourceBuffer = this.sourceBuffer
        sourceBuffer.appendBuffer(allSegments)

        return new Promise((resolve, reject) => {
            const updateEnd = (_) => {
                sourceBuffer.removeEventListener("updateend", updateEnd)
                sourceBuffer.timestampOffset = this.videoDuration

                return resolve()
            }

            sourceBuffer.addEventListener("updateend", updateEnd)
            sourceBuffer.addEventListener("error", reject)
        })
    }
}