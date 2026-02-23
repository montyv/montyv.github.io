// document.addEventListener('DOMContentLoaded', function() {
//     var elems = document.querySelectorAll('.collapsible');
//     var instances = M.Collapsible.init(elems, {accordion: false});
// });

$(document).ready(function(){
	$('.sidenav').sidenav();
	$('.materialboxed').materialbox();
	$('.parallax').parallax();
	$('.collapsible').collapsible();
	$('.scrollspy').scrollSpy();
});