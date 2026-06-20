function MVec(x,y,z){this.x=x||0;this.y=y||0;this.z=z||0;}
MVec.prototype.clone=function(){return new MVec(this.x,this.y,this.z)};
MVec.prototype.copy=function(v){this.x=v.x;this.y=v.y;this.z=v.z;return this};
MVec.prototype.set=function(x,y,z){this.x=x;this.y=y;this.z=z;return this};
MVec.prototype.add=function(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this};
MVec.prototype.sub=function(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this};
MVec.prototype.subVectors=function(a,b){this.x=a.x-b.x;this.y=a.y-b.y;this.z=a.z-b.z;return this};
MVec.prototype.normalize=function(){return this};
MVec.prototype.length=function(){return 1};
MVec.prototype.lengthSq=function(){return 1};
MVec.prototype.distanceTo=function(){return 5};
MVec.prototype.multiplyScalar=function(s){this.x*=s;this.y*=s;this.z*=s;return this};
MVec.prototype.lerp=function(v,t){return this};

function MColor(c){this.v=c||0}
MColor.prototype.set=function(c){this.v=c};
MColor.prototype.clone=function(){return new MColor(this.v)};
MColor.prototype.copy=function(c){this.v=c.v};

function MMat(p){this.color=new MColor(p&&p.color||0);this.emissive=new MColor(p&&p.emissive||0);this.opacity=(p&&p.opacity!==undefined)?p.opacity:1;this.side=(p&&p.side!==undefined)?p.side:0}

function MEuler(){this.x=0;this.y=0;this.z=0}
MEuler.prototype.set=function(x,y,z){this.x=x||0;this.y=y||0;this.z=z||0;return this};

function MGroup(){this.children=[];this.isMesh=false;this.position={x:0,y:0,z:0,copy:function(){},set:function(){},add:function(){}};this.rotation=new MEuler();this.scale={x:1,y:1,z:1,set:function(){},multiplyScalar:function(){}};this.name='';}
MGroup.prototype.add=function(c){this.children.push(c)};

function MMesh(g,m){this.children=[];this.isMesh=true;this.position={x:0,y:0,z:0,copy:function(){},set:function(){},add:function(){}};this.rotation=new MEuler();this.scale={x:1,y:1,z:1,set:function(){},multiplyScalar:function(){}};this.material=m||new MMat();this.castShadow=false;this.receiveShadow=false;this.name='';}
MMesh.prototype.add=function(c){this.children.push(c)};

function MLight(){this.isLight=true;this.position=new MVec();this.castShadow=false;this.shadow={mapSize:{width:0,height:0},camera:{near:0,far:0,left:0,right:0,top:0,bottom:0}}}

var THREE={
    Scene:function(){this.fog=null;this.children=[];this.add=function(){}},
    PerspectiveCamera:function(){this.aspect=1;this.updateProjectionMatrix=function(){};this.position=new MVec();this.lookAt=function(){}},
    WebGLRenderer:function(o){this.setSize=function(){};this.setPixelRatio=function(){};this.render=function(){};this.shadowMap={enabled:false,type:0};this.toneMapping=0;this.toneMappingExposure=1;this.domElement=document.createElement('canvas')},
    Fog:function(){},
    Vector3:MVec,
    Color:MColor,
    Group:MGroup,
    Mesh:MMesh,
    MeshStandardMaterial:MMat,
    MeshBasicMaterial:MMat,
    ShaderMaterial:function(p){this.uniforms=p?p.uniforms:{};this.side=0},
    CylinderGeometry:function(){},ConeGeometry:function(){},SphereGeometry:function(){},
    BoxGeometry:function(){},CircleGeometry:function(){},PlaneGeometry:function(){},
    TorusGeometry:function(){},OctahedronGeometry:function(){},GridHelper:function(){this.position={x:0,y:0,z:0,set:function(){}}},
    DirectionalLight:function(){var p=new MVec();this.position=p;this.castShadow=false;this.shadow={mapSize:{width:0,height:0},camera:{near:0,far:0,left:0,right:0,top:0,bottom:0}};this.isLight=true},
    PointLight:function(){this.position=new MVec();this.isLight=true},
    AmbientLight:function(){this.isLight=true},
    PCFSoftShadowMap:1,ACESFilmicToneMapping:1,BackSide:1,DoubleSide:1
};
