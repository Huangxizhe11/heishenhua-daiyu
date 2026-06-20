var JSDOM = require('jsdom').JSDOM;
var fs = require('fs');
var path = require('path');

var dir = '/Users/admin/Documents/project/腾讯黑客松项目/黑神话daiyu';
var jsFiles = ['config.js','levels.js','audio.js','world.js','player.js','boss.js','vfx.js','main.js'];

var html = fs.readFileSync(path.join(dir,'index.html'),'utf8');

// Replace CDN script with mock
var THREE_MOCK = fs.readFileSync(path.join(dir,'test_three_mock.js'),'utf8');
html = html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/, '<script>'+THREE_MOCK+'</script>');

// Replace local scripts with inline
jsFiles.forEach(function(f){
    var content = fs.readFileSync(path.join(dir,'js',f),'utf8');
    html = html.replace('<script src="js/'+f+'"></script>', '<script>'+content+'</script>');
});

var errors = [];
var dom = new JSDOM(html, {
    runScripts:'dangerously',
    pretendToBeVisual:true,
    url:'http://localhost:8080/',
    beforeParse:function(window){
        window.addEventListener('error',function(e){
            errors.push((e.filename||'inline')+':'+(e.lineno||'?')+' '+e.message);
        });
    }
});

setTimeout(function(){
    var w = dom.window;
    
    console.log('=== ERRORS ===');
    if(errors.length===0) console.log('  None');
    else errors.forEach(function(e){ console.log('  '+e); });
    
    console.log('\n=== GLOBALS ===');
    ['CONFIG','SKILLS','LEVELS','PROLOGUE','audio'].forEach(function(g){
        console.log('  '+g+': '+(w[g]!==undefined?'OK':'MISSING'));
    });
    
    console.log('\n=== CLASSES ===');
    ['Game','Player','Boss','World','VFXManager','AudioManager'].forEach(function(c){
        console.log('  '+c+': '+(typeof w[c]==='function'?'OK':'MISSING'));
    });
    
    console.log('\n=== ELEMENTS ===');
    ['start-screen','start-btn','story-screen','story-continue','hud','boss-hud',
     'game-over','victory-screen','ending-screen','pause-screen','pause-resume',
     'controls-screen','credits-screen','controls-btn','credits-btn'].forEach(function(id){
        console.log('  #'+id+': '+(w.document.getElementById(id)?'OK':'MISSING'));
    });
    
    console.log('\n=== START SCREEN ===');
    var ss = w.document.getElementById('start-screen');
    if(ss){
        var cs = w.getComputedStyle(ss);
        console.log('  display:',cs.display);
        console.log('  bg:',cs.backgroundImage.substring(0,60));
    }
    
    dom.window.close();
    process.exit(0);
},3000);
