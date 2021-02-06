$(document).ready(function () {
  // navbar
  $(window).on('scroll', function () {
    var winddd = $(window).scrollTop();
    if (winddd) {
      $('.navbar').addClass('border-b').addClass('border-gray-200');
    } else {
      $('.navbar').removeClass('border-b').removeClass('border-gray-200');
    }
  });

  // backtotop
  $('#backToTop').click(function (e) {
    e.preventDefault();
    $('html,body').stop().animate({
      scrollTop: 0
    }, 300, 'swing')
  });

  // sidebar 
  sidebarToggle = function () {
    $('#sidebar').toggleClass('sidebar-active').toggleClass('sidebar-hide');
    $('#bg-dark').toggleClass('hidden').toggleClass('block');
  }

  infobarToggle = function () {
    $('#infobar').toggleClass('infobar-hide');
    $('#chat').toggleClass('infobar-hide-chat');
    if($('#infobar').hasClass('infobar-hide')) {
      $('#infobar-btn').addClass('text-gray-600').removeClass('text-blue-500').addClass('mdi-information-outline').removeClass('mdi-information');
    } else {
      $('#infobar-btn').removeClass('text-gray-600').addClass('text-blue-500').addClass('mdi-information').removeClass('mdi-information-outline');
    }
  }

  $('#bg-dark').click(function () {
    sidebarToggle();
  });

});