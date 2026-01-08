export default async function decorate(block) {
 const rows = [...block.children];
 for(const row of rows){
   const link = row.querySelector("a");
   const image = row.querySelector("picture");
   console.log(link, image);
 }
}