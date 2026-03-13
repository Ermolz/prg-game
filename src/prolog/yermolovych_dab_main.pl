% Yermolovych Zakhar Maksymovych
% yermolovych_dab_main.pl
% Dots and Boxes: single entry point and public API.
% This module re-exports the main predicates from core and bot modules.

:- module(yermolovych_dab_main, [
    initial_state/3,
    legal_move/3,
    apply_move/5,
    possible_moves/2,
    bot_move_greedy_safe/3,
    choose_bot_move/5,
    game_over/1
]).

% ============================================================
% Публічний інтерфейс програми
% ============================================================
%
% Призначення модуля:
%   Цей модуль є єдиною публічною точкою входу до програми.
%   Він не містить власної ігрової логіки, а лише експортує
%   основні предикати з інших модулів:
%
%     - yermolovych_dab_core : базова логіка гри;
%     - yermolovych_dab_bot  : логіка вибору ходу бота.
%
% Особливість:
%   У цьому файлі відсутні власні визначення предикатів.
%   Тому індикатори параметрів, аналіз мультипризначенності
%   та приклади змістовних режимів наведені у тих модулях,
%   де відповідні предикати безпосередньо реалізовані.

:- use_module(yermolovych_dab_core, [
    initial_state/3,
    legal_move/3,
    apply_move/5,
    possible_moves/2,
    game_over/1
]).

:- use_module(yermolovych_dab_bot, [
    bot_move_greedy_safe/3,
    choose_bot_move/5
]).