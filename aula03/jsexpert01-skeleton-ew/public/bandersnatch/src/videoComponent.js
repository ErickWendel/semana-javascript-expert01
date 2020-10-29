class VideoComponent {
    constructor() {
        this.modal = {}
    }

    initializePlayer() {
        const player = videojs('vid');
        const ModalDialog = videojs.getComponent('ModalDialog');
        const modal = new ModalDialog(player, {
            temporary: false,
            closeable: true
        });

        player.addChild(modal);

        player.on('play', () => modal.close())
        
        this.modal = modal
    }
    configureModal(selected) {
        const modal = this.modal
        modal.on('modalopen', this.getModalTemplate(selected, modal))
        modal.open()
    }

    getModalTemplate(options, modal) {
        return (_) => {
            const [ option1, option2] = options
            const htmlTemplate = `
            <div class='overlay'>
                <div class='videoButtonWrapper'>
                    <button class="btn btn-dark" onclick="window.nextChunk('${option1}')">
                        ${option1}
                    </button>
                    <button class="btn btn-dark" onclick="window.nextChunk('${option2}')">
                        ${option2}
                    </button>
                </div>
            </div>
            `

            modal.contentEl().innerHTML = htmlTemplate
        }
    }
}