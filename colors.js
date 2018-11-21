var colorNames = require('color-name');
var dictionary=require('./lib/dictionary.model')

  


// //     if (!this.isChecked[el.name]) {
// //         this.isChecked[el.name] = {};
// //         for (const key of el.values) {
// //           this.isChecked[el.name][key] = false;
// //         }
// //       }



// //       translateWord(word: string | number): string {
// //         const translation = this.wordDictionary[(word + '').toUpperCase()];
// //         if (translation)
// //           return translation;
// //         else if (+word) {
// //           return (+word).toLocaleString('fa', {useGrouping: false});
// //         }
// //         return word + '';
// //       }
    
// //       translateColor(col: any) {
// //         return col && col.name ? col.name.split('/').map(r => r.split('-'))
// //           .reduce((x, y) => x.concat(y)).map(r => this.translateWord(r)).join(' / ') : 'نامعین';
// //       }
    
// //       convertColor(color: string): string {
// //         let convertedColor = this.colorDictionary[color.toUpperCase()];
// //         if (!convertedColor) {
// //           convertedColor = color;
// //         }
    
// //         try {
// //           convertedColor = colorConverter(convertedColor);
// //         } catch (e) {
// //           return null;
// //         }
    
// //         return convertedColor;
// //       }

// //     for (const col in this.isChecked.color) {
// //         let color;
// //         color = this.dict.convertColor(col);
// //         this.translatedColor[col] = this.dict.translateWord(col);
// //         if (color) {
// //           this.oppositeColor[col] = parseInt(color.substring(1), 16) < parseInt('888888', 16) ? 'white' : 'black';
// //           const red = color.substring(1, 3);
// //           const green = color.substring(3, 5);
// //           const blue = color.substring(5, 7);
// //           const colors = [red, green, blue];
// //           this.needsBorder[col] = colors.map(c => parseInt('ff', 16) - parseInt(c, 16) < 16).reduce((x, y) => x && y);
// //         } else {
// //           this.oppositeColor[col] = 'white';
// //         }
// //       }
    
      
// //         httpService.get('dictionary').subscribe((res: any) => {
// //           res.forEach(x => {
// //             if (x.type === 'tag') {
// //               this.wordDictionary[x.name] = x.value;
// //             } else if (x.type === 'color') {
// //               this.colorDictionary[x.name] = x.value;
// //             }
// //           });
// //         });


// // 1.get color names from database
// // 2.separate colors 
// // 3.add them to database as the only colors existing?
// // 4.filter them in specific categories
// // 4.1 four categories:
// //     1)main colors
// //     2)colors that have the main color name in them
// //     3)colors with no specific meaning 
// //     4)colors that have a rgb translation
// // 5.add the second and third part in dictionary
// // 6.put each color in one of main colors
// // 7.show their category of color as their translation
whites=[];
blacks=[];
greens=[];
silvers=[];
khakis=[];
yellows=[];
blues=[];
greys=[];






 function productColorMap(r) {
    return r.colors.map(c => c.name ? c.name.split('/')
        .map(n => n.split('-'))
        .reduce((x, y) => x.concat(y), [])
        .map(n => n.replace(/[()]/g, ''))
      : []);
  }

 r= [

    {
        colors:[

         {  name: "COOL GREY/WHITE-WOLF GREY-BLACK/WOLF BLACK"},
         {name:"BLACK/BLACK/REFLECTIVE SILV/WHITE/crimson"}
        ]
      
     }
  ]
 
 const singledc = Array.from(new Set([...r.map(productColorMap)
    .reduce((x, y) => x.concat(y), []).reduce((x, y) => x.concat(y), [])]));

console.log(singledc);



singledc.forEach(element => {
  if( element.includes("BLACK")) {blacks.push(element);}
 else if( element.includes("WHITE")) {whites.push(element);}
 else  if( element.includes("GREY")) {greys.push(element);}
  else if( element.includes("BLUE")) {blues.push(element);}
  else if( element.includes("GREEN")) {greens.push(element);}
  else if( element.includes("YELLOW")) {yellows.push(element);}
  else if( element.includes("SILVER")) {silvers.push(element);}

else if(colorNames[element]){
   
   
   
   
   console.log(colorNames[element])}
   // else{
   //    body={
   //       name:element,
   //       type:"color",
   //       value:element
   //    }
   //    addDictionary(body)
   // }
});
console.log(silvers)
console.log(blues)
console.log(greys)










