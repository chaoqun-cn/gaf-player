import './style.css'

import PCMPlayer from './player/pcm-player'
import YUVPlayer from './player/yuv-player'
import BlobLoader from './io/blob-loader'


// const blobLoader = new BlobLoader()
// blobLoader.on('finish', (e) => console.log(e))
// blobLoader.open(new Blob(['one, two, three'], {type : 'text/csv'} ))

const vplayer = new YUVPlayer({
    el: '.gaf-player',
    resolution: '960x540',
    // resolution: '602x600',
    frameRate: 24
})

const fileInput = document.querySelector('input[type="file"]')
fileInput.addEventListener('change', function() {
    const file = fileInput.files[0]
    file && vplayer.play(file)
}, false);





//const aplayer = new PCMPlayer()

// const playBtn = document.querySelector('.play-btn')
// playBtn.addEventListener('click', function() {
//     aplayer.play().then(() => console.log('begin play')).catch(r => console.log(r))
// }, false)



