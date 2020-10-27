async function main() {
    const player = videojs('vid');
    const ModalDialog = videojs.getComponent('ModalDialog');
    const modal = new ModalDialog(player, {
        temporary: false, 
        closeable: true
    });

    player.addChild(modal);

}

window.onload = main