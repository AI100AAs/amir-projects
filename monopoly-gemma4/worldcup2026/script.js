// 48 Teams Database - Real World Data + Authentic Elo Ratings + Climate Adaptation
// Climates: 'mild' (Europe), 'heat' (Africa/SA), 'humid' (CA/SA), 'versatile' (Top tier global squads)
const db = {
    'mex': { id: 'mex', name: 'Mexico', flag: '🇲🇽', elo: 1943, climate: 'heat', age: 25.8, tactic: '4-3-3', atk: 79, mid: 78, def: 79, gk: 78, stars: ['S. Giménez', 'E. Álvarez', 'L. Chávez', 'C. Montes'] }, 
    'rsa': { id: 'rsa', name: 'South Africa', flag: '🇿🇦', elo: 1559, climate: 'heat', age: 27.0, tactic: '3-5-2', atk: 71, mid: 72, def: 71, gk: 73, stars: ['Lyle Foster', 'Ronwen Williams', 'T. Mokoena', 'A. Modiba'] }, 
    'kor': { id: 'kor', name: 'South Korea', flag: '🇰🇷', elo: 1723, climate: 'mild', age: 25.7, tactic: '4-2-3-1', atk: 81, mid: 77, def: 76, gk: 74, stars: ['Son Heung-min', 'Kim Min-jae', 'Lee Kang-in', 'Hwang Hee-chan'] }, 
    'cze': { id: 'cze', name: 'Czech Republic', flag: '🇨🇿', elo: 1680, climate: 'mild', age: 25.7, tactic: '3-5-2', atk: 77, mid: 76, def: 76, gk: 75, stars: ['P. Schick', 'T. Souček', 'V. Coufal', 'L. Provod'] },
    
    'sui': { id: 'sui', name: 'Switzerland', flag: '🇨🇭', elo: 1914, climate: 'mild', age: 25.1, tactic: '4-4-2', atk: 78, mid: 81, def: 81, gk: 85, stars: ['G. Xhaka', 'D. Zakaria', 'M. Akanji', 'B. Embolo'] }, 
    'can': { id: 'can', name: 'Canada', flag: '🇨🇦', elo: 1764, climate: 'mild', age: 26.9, tactic: '4-3-3', atk: 80, mid: 76, def: 76, gk: 75, stars: ['A. Davies', 'J. David', 'C. Larin', 'S. Eustáquio'] }, 
    'bih': { id: 'bih', name: 'Bosnia and Herz.', flag: '🇧🇦', elo: 1605, climate: 'mild', age: 25.7, tactic: '3-5-2', atk: 74, mid: 73, def: 72, gk: 71, stars: ['E. Džeko', 'S. Kolašinac', 'A. Dedić', 'E. Demirović'] }, 
    'qat': { id: 'qat', name: 'Qatar', flag: '🇶🇦', elo: 1411, climate: 'heat', age: 27.2, tactic: '5-3-2', atk: 73, mid: 69, def: 67, gk: 68, stars: ['Akram Afif', 'Almoez Ali', 'H. Al-Haydos', 'B. Khoukhi'] },
    
    'bra': { id: 'bra', name: 'Brazil', flag: '🇧🇷', elo: 2031, climate: 'humid', age: 28.5, tactic: '4-3-3', atk: 88, mid: 85, def: 86, gk: 89, stars: ['Vinícius Jr.', 'Neymar', 'Raphinha', 'Lucas Paquetá'] }, 
    'mar': { id: 'mar', name: 'Morocco', flag: '🇲🇦', elo: 1886, climate: 'heat', age: 27.6, tactic: '4-3-3', atk: 81, mid: 82, def: 83, gk: 84, stars: ['A. Hakimi', 'Brahim Díaz', 'Y. Bounou', 'S. Amrabat'] }, 
    'sco': { id: 'sco', name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', elo: 1753, climate: 'mild', age: 26.6, tactic: '5-3-2', atk: 75, mid: 79, def: 77, gk: 75, stars: ['S. McTominay', 'A. Robertson', 'J. McGinn', 'B. Gilmour'] }, 
    'hai': { id: 'hai', name: 'Haiti', flag: '🇭🇹', elo: 1517, climate: 'humid', age: 26.5, tactic: '5-3-2', atk: 71, mid: 68, def: 68, gk: 67, stars: ['Duckens Nazon', 'Frantzdy Pierrot', 'D. Jean Jacques', 'Carlens Arcus'] },
    
    'usa': { id: 'usa', name: 'United States', flag: '🇺🇸', elo: 1798, climate: 'versatile', age: 24.8, tactic: '4-2-3-1', atk: 81, mid: 79, def: 78, gk: 78, stars: ['C. Pulisic', 'W. McKennie', 'F. Balogun', 'T. Adams'] }, 
    'aus': { id: 'aus', name: 'Australia', flag: '🇦🇺', elo: 1800, climate: 'heat', age: 27.6, tactic: '5-3-2', atk: 74, mid: 75, def: 76, gk: 80, stars: ['Mathew Ryan', 'Harry Souttar', 'Mathew Leckie', 'Jackson Irvine'] }, 
    'par': { id: 'par', name: 'Paraguay', flag: '🇵🇾', elo: 1823, climate: 'humid', age: 26.9, tactic: '4-4-2', atk: 77, mid: 78, def: 79, gk: 77, stars: ['M. Almirón', 'Julio Enciso', 'Gustavo Gómez', 'Diego Gómez'] }, 
    'tur': { id: 'tur', name: 'Türkiye', flag: '🇹🇷', elo: 1852, climate: 'mild', age: 25.3, tactic: '3-5-2', atk: 81, mid: 82, def: 79, gk: 79, stars: ['H. Çalhanoğlu', 'Arda Güler', 'Kenan Yıldız', 'Ferdi Kadıoğlu'] },
    
    'ger': { id: 'ger', name: 'Germany', flag: '🇩🇪', elo: 1908, climate: 'mild', age: 28, tactic: '4-2-3-1', atk: 85, mid: 87, def: 84, gk: 88, stars: ['Florian Wirtz', 'Jamal Musiala', 'J. Kimmich', 'Kai Havertz'] }, 
    'civ': { id: 'civ', name: 'Côte d\'Ivoire', flag: '🇨🇮', elo: 1727, climate: 'heat', age: 25.4, tactic: '3-5-2', atk: 79, mid: 78, def: 78, gk: 75, stars: ['Amad Diallo', 'Simon Adingra', 'Franck Kessié', 'O. Kossonou'] }, 
    'ecu': { id: 'ecu', name: 'Ecuador', flag: '🇪🇨', elo: 1871, climate: 'versatile', age: 25.6, tactic: '5-3-2', atk: 79, mid: 81, def: 82, gk: 78, stars: ['P. Estupiñán', 'Moisés Caicedo', 'P. Hincapié', 'Enner Valencia'] }, 
    'cuw': { id: 'cuw', name: 'Curaçao', flag: '🇨🇼', elo: 1438, climate: 'humid', age: 27.5, tactic: '5-3-2', atk: 69, mid: 68, def: 68, gk: 69, stars: ['J. Bacuna', 'Leandro Bacuna', 'Eloy Room', 'G. Kastaneer'] },
    
    'ned': { id: 'ned', name: 'Netherlands', flag: '🇳🇱', elo: 1971, climate: 'mild', age: 26, tactic: '4-2-3-1', atk: 83, mid: 85, def: 87, gk: 82, stars: ['V. van Dijk', 'Frenkie de Jong', 'Cody Gakpo', 'M. Depay'] }, 
    'jpn': { id: 'jpn', name: 'Japan', flag: '🇯🇵', elo: 1888, climate: 'versatile', age: 25.9, tactic: '4-2-3-1', atk: 81, mid: 82, def: 80, gk: 76, stars: ['Takefusa Kubo', 'Ritsu Doan', 'Wataru Endo', 'Daizen Maeda'] }, 
    'swe': { id: 'swe', name: 'Sweden', flag: '🇸🇪', elo: 1731, climate: 'mild', age: 26.8, tactic: '4-4-2', atk: 84, mid: 77, def: 76, gk: 76, stars: ['Viktor Gyökeres', 'Alexander Isak', 'Anthony Elanga', 'Victor Lindelöf'] }, 
    'tun': { id: 'tun', name: 'Tunisia', flag: '🇹🇳', elo: 1562, climate: 'heat', age: 25.1, tactic: '5-3-2', atk: 71, mid: 72, def: 73, gk: 71, stars: ['Ellyes Skhiri', 'Hannibal Mejbri', 'Elias Achouri', 'M. Talbi'] },
    
    'bel': { id: 'bel', name: 'Belgium', flag: '🇧🇪', elo: 1910, climate: 'mild', age: 28.8, tactic: '4-2-3-1', atk: 84, mid: 84, def: 78, gk: 83, stars: ['K. De Bruyne', 'Romelu Lukaku', 'L. Trossard', 'Jérémy Doku'] }, 
    'egy': { id: 'egy', name: 'Egypt', flag: '🇪🇬', elo: 1742, climate: 'heat', age: 25.8, tactic: '4-2-3-1', atk: 82, mid: 75, def: 75, gk: 77, stars: ['Mohamed Salah', 'Omar Marmoush', 'Mohamed El-Shenawy', 'Trezeguet'] }, 
    'irn': { id: 'irn', name: 'IR Iran', flag: '🇮🇷', elo: 1764, climate: 'heat', age: 26.7, tactic: '3-5-2', atk: 78, mid: 74, def: 74, gk: 75, stars: ['Mehdi Taremi', 'Saeid Ezatolahi', 'Alireza Jahanbakhsh', 'M. Mohammadi'] }, 
    'nzl': { id: 'nzl', name: 'New Zealand', flag: '🇳🇿', elo: 1534, climate: 'mild', age: 26.2, tactic: '3-5-2', atk: 70, mid: 69, def: 71, gk: 70, stars: ['Chris Wood', 'Liberato Cacace', 'Sarpreet Singh', 'Joe Bell'] },
    
    'esp': { id: 'esp', name: 'Spain', flag: '🇪🇸', elo: 2159, climate: 'heat', age: 25.2, tactic: '4-3-3', atk: 87, mid: 90, def: 86, gk: 84, stars: ['Rodri', 'Lamine Yamal', 'Nico Williams', 'Pedri'] }, 
    'cpv': { id: 'cpv', name: 'Cape Verde', flag: '🇨🇻', elo: 1622, climate: 'heat', age: 26.6, tactic: '4-3-3', atk: 72, mid: 72, def: 72, gk: 71, stars: ['Ryan Mendes', 'Garry Rodrigues', 'Jamiro Monteiro', 'Logan Costa'] }, 
    'uru': { id: 'uru', name: 'Uruguay', flag: '🇺🇾', elo: 1841, climate: 'versatile', age: 27.5, tactic: '4-4-2', atk: 83, mid: 85, def: 82, gk: 79, stars: ['F. Valverde', 'Darwin Núñez', 'Ronald Araújo', 'Manuel Ugarte'] }, 
    'ksa': { id: 'ksa', name: 'Saudi Arabia', flag: '🇸🇦', elo: 1596, climate: 'heat', age: 26.8, tactic: '5-3-2', atk: 71, mid: 72, def: 71, gk: 71, stars: ['Salem Al-Dawsari', 'F. Al-Buraikan', 'Saud Abdulhamid', 'Saleh Al Shehri'] },
    
    'fra': { id: 'fra', name: 'France', flag: '🇫🇷', elo: 2134, climate: 'versatile', age: 26.5, tactic: '4-3-3', atk: 91, mid: 86, def: 88, gk: 87, stars: ['Kylian Mbappé', 'Michael Olise', 'William Saliba', 'Ousmane Dembélé'] }, 
    'nor': { id: 'nor', name: 'Norway', flag: '🇳🇴', elo: 1934, climate: 'mild', age: 27.9, tactic: '4-4-2', atk: 87, mid: 83, def: 78, gk: 77, stars: ['Erling Haaland', 'Martin Ødegaard', 'Alexander Sørloth', 'Leo Østigård'] }, 
    'sen': { id: 'sen', name: 'Senegal', flag: '🇸🇳', elo: 1816, climate: 'heat', age: 25.0, tactic: '4-3-3', atk: 79, mid: 78, def: 79, gk: 80, stars: ['Sadio Mané', 'Nicolas Jackson', 'Kalidou Koulibaly', 'Pape Matar Sarr'] }, 
    'irq': { id: 'irq', name: 'Iraq', flag: '🇮🇶', elo: 1561, climate: 'heat', age: 27.7, tactic: '5-3-2', atk: 73, mid: 70, def: 70, gk: 69, stars: ['Aymen Hussein', 'Ali Jasim', 'Zidane Iqbal', 'Rebin Sulaka'] },
    
    'arg': { id: 'arg', name: 'Argentina', flag: '🇦🇷', elo: 2148, climate: 'versatile', age: 29.5, tactic: '4-2-3-1', atk: 89, mid: 86, def: 85, gk: 87, stars: ['Lionel Messi', 'Lautaro Martínez', 'A. Mac Allister', 'Julián Álvarez'] }, 
    'aut': { id: 'aut', name: 'Austria', flag: '🇦🇹', elo: 1821, climate: 'mild', age: 26.7, tactic: '4-4-2', atk: 79, mid: 81, def: 79, gk: 77, stars: ['Marcel Sabitzer', 'Konrad Laimer', 'C. Baumgartner', 'David Alaba'] }, 
    'alg': { id: 'alg', name: 'Algeria', flag: '🇩🇿', elo: 1785, climate: 'heat', age: 26.2, tactic: '3-5-2', atk: 78, mid: 77, def: 76, gk: 75, stars: ['Riyad Mahrez', 'Rayan Aït-Nouri', 'Amine Gouiri', 'Houssem Aouar'] }, 
    'jor': { id: 'jor', name: 'Jordan', flag: '🇯🇴', elo: 1628, climate: 'heat', age: 26.6, tactic: '5-3-2', atk: 74, mid: 71, def: 71, gk: 70, stars: ['Mousa Al-Tamari', 'Nizar Al-Rashdan', 'Ali Olwan', 'Yazan Al-Arab'] },
    
    'col': { id: 'col', name: 'Colombia', flag: '🇨🇴', elo: 2004, climate: 'humid', age: 26.6, tactic: '4-3-3', atk: 85, mid: 83, def: 82, gk: 81, stars: ['Luis Díaz', 'James Rodríguez', 'Daniel Muñoz', 'Jefferson Lerma'] }, 
    'por': { id: 'por', name: 'Portugal', flag: '🇵🇹', elo: 2013, climate: 'versatile', age: 26.5, tactic: '4-3-3', atk: 88, mid: 86, def: 85, gk: 85, stars: ['Bruno Fernandes', 'Cristiano Ronaldo', 'Rafael Leão', 'Rúben Dias'] }, 
    'cod': { id: 'cod', name: 'DR Congo', flag: '🇨🇩', elo: 1704, climate: 'heat', age: 27.8, tactic: '5-3-2', atk: 75, mid: 74, def: 75, gk: 73, stars: ['Chancel Mbemba', 'Yoane Wissa', 'Cédric Bakambu', 'Arthur Masuaku'] }, 
    'uzb': { id: 'uzb', name: 'Uzbekistan', flag: '🇺🇿', elo: 1631, climate: 'mild', age: 26.0, tactic: '4-4-2', atk: 73, mid: 72, def: 72, gk: 70, stars: ['Eldor Shomurodov', 'Abbosbek Fayzullaev', 'Otabek Shukurov', 'Rustam Ashurmatov'] },
    
    'eng': { id: 'eng', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', elo: 2046, climate: 'mild', age: 25.5, tactic: '4-2-3-1', atk: 89, mid: 88, def: 84, gk: 83, stars: ['Harry Kane', 'Jude Bellingham', 'Declan Rice', 'Bukayo Saka'] }, 
    'cro': { id: 'cro', name: 'Croatia', flag: '🇭🇷', elo: 1882, climate: 'mild', age: 29.2, tactic: '4-2-3-1', atk: 78, mid: 85, def: 81, gk: 82, stars: ['Luka Modrić', 'Mateo Kovačić', 'Joško Gvardiol', 'Andrej Kramarić'] }, 
    'gha': { id: 'gha', name: 'Ghana', flag: '🇬🇭', elo: 1575, climate: 'heat', age: 26.1, tactic: '4-4-2', atk: 77, mid: 76, def: 74, gk: 70, stars: ['Antoine Semenyo', 'Iñaki Williams', 'Thomas Partey', 'Jordan Ayew'] }, 
    'pan': { id: 'pan', name: 'Panama', flag: '🇵🇦', elo: 1658, climate: 'humid', age: 25.2, tactic: '5-3-2', atk: 72, mid: 72, def: 73, gk: 72, stars: ['A. Carrasquilla', 'Amir Murillo', 'Fidel Escobar', 'José Fajardo'] }
};

const groupData = {
    'A': [ {id: 'mex', w:3, d:0, l:0, gd: 5, pts:9}, {id: 'rsa', w:1, d:1, l:1, gd: 0, pts:4}, {id: 'kor', w:1, d:0, l:2, gd: -2, pts:3}, {id: 'cze', w:0, d:1, l:2, gd: -3, pts:1} ],
    'B': [ {id: 'sui', w:2, d:1, l:0, gd: 4, pts:7}, {id: 'can', w:1, d:1, l:1, gd: 1, pts:4}, {id: 'bih', w:1, d:1, l:1, gd: 0, pts:4}, {id: 'qat', w:0, d:1, l:2, gd: -5, pts:1} ],
    'C': [ {id: 'bra', w:2, d:1, l:0, gd: 6, pts:7}, {id: 'mar', w:2, d:1, l:0, gd: 4, pts:7}, {id: 'sco', w:1, d:0, l:2, gd: -3, pts:3}, {id: 'hai', w:0, d:0, l:3, gd: -7, pts:0} ],
    'D': [ {id: 'usa', w:2, d:1, l:0, gd: 4, pts:7}, {id: 'aus', w:1, d:2, l:0, gd: 2, pts:5}, {id: 'par', w:1, d:1, l:1, gd: -1, pts:4}, {id: 'tur', w:0, d:0, l:3, gd: -5, pts:0} ],
    'E': [ {id: 'ger', w:2, d:0, l:1, gd: 3, pts:6}, {id: 'civ', w:2, d:0, l:1, gd: 2, pts:6}, {id: 'ecu', w:1, d:1, l:1, gd: 0, pts:4}, {id: 'cuw', w:0, d:1, l:2, gd: -5, pts:1} ],
    'F': [ {id: 'ned', w:2, d:1, l:0, gd: 5, pts:7}, {id: 'jpn', w:2, d:0, l:1, gd: 2, pts:6}, {id: 'swe', w:1, d:0, l:2, gd: -2, pts:3}, {id: 'tun', w:0, d:1, l:2, gd: -5, pts:1} ],
    'G': [ {id: 'bel', w:2, d:1, l:0, gd: 4, pts:7}, {id: 'egy', w:1, d:1, l:1, gd: 0, pts:4}, {id: 'irn', w:0, d:3, l:0, gd: 0, pts:3}, {id: 'nzl', w:0, d:1, l:2, gd: -4, pts:1} ],
    'H': [ {id: 'esp', w:2, d:1, l:0, gd: 6, pts:7}, {id: 'cpv', w:1, d:1, l:1, gd: -3, pts:4}, {id: 'uru', w:0, d:2, l:1, gd: -1, pts:2}, {id: 'ksa', w:0, d:2, l:1, gd: -2, pts:2} ],
    'I': [ {id: 'fra', w:3, d:0, l:0, gd: 7, pts:9}, {id: 'nor', w:2, d:0, l:1, gd: 3, pts:6}, {id: 'sen', w:1, d:0, l:2, gd: -2, pts:3}, {id: 'irq', w:0, d:0, l:3, gd: -8, pts:0} ],
    'J': [ {id: 'arg', w:3, d:0, l:0, gd: 8, pts:9}, {id: 'aut', w:1, d:1, l:1, gd: 0, pts:4}, {id: 'alg', w:1, d:1, l:1, gd: -1, pts:4}, {id: 'jor', w:0, d:0, l:3, gd: -7, pts:0} ],
    'K': [ {id: 'col', w:3, d:0, l:0, gd: 3, pts:9}, {id: 'por', w:1, d:1, l:1, gd: 1, pts:4}, {id: 'cod', w:1, d:1, l:1, gd: 0, pts:4}, {id: 'uzb', w:0, d:0, l:3, gd: -4, pts:0} ],
    'L': [ {id: 'eng', w:2, d:1, l:0, gd: 5, pts:7}, {id: 'cro', w:2, d:0, l:1, gd: 2, pts:6}, {id: 'gha', w:1, d:1, l:1, gd: 0, pts:4}, {id: 'pan', w:0, d:0, l:3, gd: -7, pts:0} ]
};

// Calibrated to WC historical data (group ~2.62 gpg, knockout ~2.28, draw rho ~-0.12)
const MODEL = {
    eloSquadBlend: 0.55,
    xgEloBlend: 0.70,
    baseXG: { group: 2.62, knockout: 2.28 },
    rho: -0.20,
    closeMatchElo: 220,
    closeMatchCompress: 0.28,
    knockoutCloseElo: 200,
    knockoutCloseCompress: 0.14,
    defensiveDrawXG: 0.55,
    maxGoals: 5,
    jitter: 25,
    hostElo: 28,
    coHostElo: 16,
    americasElo: 10,
    cinderella: 12,
    h2h: 8,
    political: 18,
    tactic: 12,
    moraleBoost: 10,
    rivalryCompress: 0.20,
    injuryChance: 0.01,
    injuryPenalty: 35,
    redCardBase: 0.03,
    varChance: 0.06,
    varSwing: 25,
    maxFatigue: 60,
    momentum: { perfect: 18, strong: 8, weak: -12 }
};

const HOST_NATIONS = new Set(['usa', 'mex', 'can']);
const AMERICAS_TEAMS = new Set(['usa', 'mex', 'can', 'pan', 'hai', 'cuw', 'bra', 'uru', 'col', 'par', 'ecu']);

// Host Cities Database (Weather conditions & Elo impacts)
const venues = [
    { city: 'Miami', lat: 25.76, lon: -80.19, isIndoor: false, weather: 'Loading...', hostileTo: [], buffTo: [], isHostVenue: true, hostNation: 'usa' },
    { city: 'Mexico City', lat: 19.43, lon: -99.13, isIndoor: false, weather: 'Loading...', hostileTo: [], buffTo: [], altitude: 2240, isHostVenue: true, hostNation: 'mex' },
    { city: 'Seattle', lat: 47.60, lon: -122.33, isIndoor: false, weather: 'Loading...', hostileTo: [], buffTo: [], isHostVenue: true, hostNation: 'usa' },
    { city: 'Vancouver', lat: 49.28, lon: -123.12, isIndoor: false, weather: 'Loading...', hostileTo: [], buffTo: [], isHostVenue: true, hostNation: 'can' },
    { city: 'Houston', lat: 29.76, lon: -95.36, isIndoor: true, weather: 'Loading...', hostileTo: [], buffTo: [], isHostVenue: true, hostNation: 'usa' },
    { city: 'Dallas', lat: 32.77, lon: -96.79, isIndoor: true, weather: 'Loading...', hostileTo: [], buffTo: [], isHostVenue: true, hostNation: 'usa' },
    { city: 'Atlanta', lat: 33.74, lon: -84.38, isIndoor: true, weather: 'Loading...', hostileTo: [], buffTo: [], isHostVenue: true, hostNation: 'usa' },
    { city: 'New York/NJ', lat: 40.71, lon: -74.00, isIndoor: false, weather: 'Loading...', hostileTo: [], buffTo: [], isHostVenue: true, hostNation: 'usa' }
];

let bracketData = {
    r32: [
        { id: 'm1', team1: db['can'], team2: db['rsa'], winner: db['can'], type: 'actual', score1: 1, score2: 0, pens1: null, pens2: null },
        { id: 'm2', team1: db['bra'], team2: db['jpn'], winner: db['bra'], type: 'actual', score1: 2, score2: 1, pens1: null, pens2: null },
        { id: 'm3', team1: db['par'], team2: db['ger'], winner: db['par'], type: 'actual', score1: 1, score2: 1, pens1: 4, pens2: 3 },
        { id: 'm4', team1: db['mar'], team2: db['ned'], winner: db['mar'], type: 'actual', score1: 1, score2: 1, pens1: 3, pens2: 2 },
        { id: 'm5', team1: db['nor'], team2: db['civ'], winner: db['nor'], type: 'actual', score1: 2, score2: 1, pens1: null, pens2: null },
        { id: 'm6', team1: db['fra'], team2: db['swe'], winner: db['fra'], type: 'actual', score1: 3, score2: 0, pens1: null, pens2: null },
        { id: 'm7', team1: db['mex'], team2: db['ecu'], winner: db['mex'], type: 'actual', score1: 2, score2: 0, pens1: null, pens2: null },
        { id: 'm8', team1: db['eng'], team2: db['cod'], winner: db['eng'], type: 'actual', score1: 2, score2: 1, pens1: null, pens2: null },
        { id: 'm9', team1: db['bel'], team2: db['sen'], winner: db['bel'], type: 'actual', score1: 3, score2: 2, pens1: null, pens2: null, extraTime: true },
        { id: 'm10', team1: db['usa'], team2: db['bih'], winner: db['usa'], type: 'actual', score1: 2, score2: 0, pens1: null, pens2: null },
        { id: 'm11', team1: db['esp'], team2: db['aut'], winner: db['esp'], type: 'actual', score1: 3, score2: 0, pens1: null, pens2: null },
        { id: 'm12', team1: db['por'], team2: db['cro'], winner: db['por'], type: 'actual', score1: 2, score2: 1, pens1: null, pens2: null },
        { id: 'm13', team1: db['sui'], team2: db['alg'], winner: db['sui'], type: 'actual', score1: 2, score2: 0, pens1: null, pens2: null },
        { id: 'm14', team1: db['aus'], team2: db['egy'], winner: db['egy'], type: 'actual', score1: 1, score2: 1, pens1: 2, pens2: 4 },
        { id: 'm15', team1: db['arg'], team2: db['cpv'], winner: db['arg'], type: 'actual', score1: 3, score2: 2, pens1: null, pens2: null, extraTime: true },
        { id: 'm16', team1: db['col'], team2: db['gha'], winner: db['col'], type: 'actual', score1: 2, score2: 0, pens1: null, pens2: null }
    ],
    r16: Array.from({length: 8}, (_, i) => ({ id: `m${17+i}`, team1: null, team2: null, winner: null, type: null, score1: null, score2: null, pens1: null, pens2: null, xG1: null, xG2: null, t1Perc: null, t2Perc: null, venue: getRandomVenue() })),
    qf: Array.from({length: 4}, (_, i) => ({ id: `m${25+i}`, team1: null, team2: null, winner: null, type: null, score1: null, score2: null, pens1: null, pens2: null, xG1: null, xG2: null, t1Perc: null, t2Perc: null, venue: getRandomVenue() })),
    sf: Array.from({length: 2}, (_, i) => ({ id: `m${29+i}`, team1: null, team2: null, winner: null, type: null, score1: null, score2: null, pens1: null, pens2: null, xG1: null, xG2: null, t1Perc: null, t2Perc: null, venue: getRandomVenue() })),
    f: [ { id: 'm31', team1: null, team2: null, winner: null, type: null, score1: null, score2: null, pens1: null, pens2: null, xG1: null, xG2: null, t1Perc: null, t2Perc: null, venue: venues.find(v => v.city === 'New York/NJ') } ],
    champion: null
};

function getRandomVenue() { return venues[Math.floor(Math.random() * venues.length)]; }

const nextMatchMap = {
    'm1': { round: 'r16', index: 0, slot: 'team1' }, 'm2': { round: 'r16', index: 2, slot: 'team1' }, 'm3': { round: 'r16', index: 1, slot: 'team1' }, 'm4': { round: 'r16', index: 0, slot: 'team2' },
    'm5': { round: 'r16', index: 2, slot: 'team2' }, 'm6': { round: 'r16', index: 1, slot: 'team2' }, 'm7': { round: 'r16', index: 3, slot: 'team1' }, 'm8': { round: 'r16', index: 3, slot: 'team2' },
    'm9': { round: 'r16', index: 4, slot: 'team1' }, 'm10': { round: 'r16', index: 4, slot: 'team2' }, 'm11': { round: 'r16', index: 5, slot: 'team1' }, 'm12': { round: 'r16', index: 5, slot: 'team2' },
    'm13': { round: 'r16', index: 7, slot: 'team1' }, 'm14': { round: 'r16', index: 6, slot: 'team2' }, 'm15': { round: 'r16', index: 6, slot: 'team1' }, 'm16': { round: 'r16', index: 7, slot: 'team2' },
    'm17': { round: 'qf', index: 0, slot: 'team1' }, 'm18': { round: 'qf', index: 0, slot: 'team2' }, 'm19': { round: 'qf', index: 1, slot: 'team1' }, 'm20': { round: 'qf', index: 1, slot: 'team2' },
    'm21': { round: 'qf', index: 2, slot: 'team1' }, 'm22': { round: 'qf', index: 2, slot: 'team2' }, 'm23': { round: 'qf', index: 3, slot: 'team1' }, 'm24': { round: 'qf', index: 3, slot: 'team2' },
    'm25': { round: 'sf', index: 0, slot: 'team1' }, 'm26': { round: 'sf', index: 0, slot: 'team2' }, 'm27': { round: 'sf', index: 1, slot: 'team1' }, 'm28': { round: 'sf', index: 1, slot: 'team2' },
    'm29': { round: 'f', index: 0, slot: 'team1' }, 'm30': { round: 'f', index: 0, slot: 'team2' },
    'm31': { round: 'champion', index: 0, slot: 'winner' }
};

let simulationLogs = [];
// Tiered fatigue: maps teamId -> cumulative ELO penalty (0, 10, 30, 45, capped at 60)
let teamFatigue = {};
let yellowCardsAccumulated = {};
let suspendedTeams = new Set();
let teamLastVenue = {};
let highMoraleTeams = new Set();
let cinderellaTeams = new Set();
// Stage pressure xG dampeners (applied per round)
const stagePressure = { r16: 0, qf: -0.08, sf: -0.15, f: -0.20 };
const h2hMatrix = {"can-sco":"sco","ger-sui":"ger","aut-ger":"ger","bel-ger":"ger","aut-nor":"aut","bel-usa":"bel","bel-eng":"eng","aus-nzl":"aus","ger-nor":"ger","aus-can":"aus","esp-sui":"esp","fra-por":"fra","can-nzl":"can","arg-por":"arg","arg-usa":"arg","arg-bel":"arg","ger-uru":"ger","fra-mex":"fra","par-usa":"usa","bra-usa":"bra","eng-sui":"eng","col-pan":"col","mex-pan":"mex","bra-swe":"bra","ecu-uru":"uru","cro-ger":"ger","bra-ecu":"bra","bel-sco":"bel","nzl-rsa":"rsa","esp-usa":"esp","eng-usa":"eng","mex-sui":"sui","ger-tur":"ger","bra-pan":"bra","hai-mex":"mex","por-tur":"por","bra-por":"bra","aut-bra":"bra","bra-tur":"bra","can-mex":"mex","fra-par":"fra","eng-mex":"eng","bra-egy":"bra","col-usa":"col","pan-par":"par","egy-ksa":"egy","nor-por":"por","bra-sco":"bra","arg-sui":"arg","jpn-mex":"mex","mar-sen":"mar","irn-irq":"irn","alg-qat":"alg","aut-tun":"aut","col-fra":"fra","bel-nor":"bel","aus-irq":"aus","can-hai":"can","aus-ger":"ger","alg-swe":"swe","kor-nzl":"kor","alg-sen":"alg","esp-nor":"esp","cpv-sen":"sen","kor-mex":"mex","aus-eng":"eng","mex-nzl":"mex","kor-qat":"kor","kor-uru":"uru","jor-qat":"qat","eng-tur":"eng","fra-mar":"fra","aus-bra":"bra","bra-ksa":"bra","arg-aus":"arg","irn-qat":"irn","bra-jpn":"bra","esp-kor":"esp","jpn-ksa":"jpn","arg-jpn":"arg","ger-usa":"ger","pan-usa":"usa","aus-fra":"fra","fra-jpn":"fra","gha-jpn":"jpn","kor-uzb":"kor","ksa-mex":"mex","bra-kor":"bra","bra-gha":"bra","bra-rsa":"bra","cze-ger":"ger","cro-por":"por","cze-por":"por","jpn-uzb":"jpn","cze-esp":"esp","fra-tur":"fra","jpn-tun":"jpn","cod-rsa":"rsa","ned-usa":"ned","aut-cro":"cro","ecu-pan":"ecu","bih-esp":"esp","bih-irn":"irn","col-jpn":"col","cpv-gha":"gha","bra-cro":"bra","aus-uzb":"aus","bih-por":"por"};
let isSimulationCancelled = false;
let activeWorkers = [];
let resolveCurrentSimulation = null;
let completedMatchupsCount = 0;

let teamMomentum = {};
let teamLastPlayDay = {};
const matchDays = {
    'm1': 1, 'm2': 1, 'm3': 1, 'm4': 1,
    'm5': 2, 'm6': 2, 'm7': 2, 'm8': 2,
    'm9': 3, 'm10': 3, 'm11': 3, 'm12': 3,
    'm13': 4, 'm14': 4, 'm15': 4, 'm16': 4,
    'm17': 7, 'm18': 7,
    'm19': 8, 'm20': 8,
    'm21': 9, 'm22': 9,
    'm23': 10, 'm24': 10,
    'm25': 13, 'm26': 13,
    'm27': 14, 'm28': 14,
    'm29': 17, 'm30': 18,
    'm31': 22
};

function calculateGroupStageMomentum() {
    teamMomentum = {};
    for (const [group, teams] of Object.entries(groupData)) {
        for (const t of teams) {
            let buff = 0;
            if (t.pts === 9) buff = MODEL.momentum.perfect;
            else if (t.pts >= 7) buff = MODEL.momentum.strong;
            else if (t.pts <= 2) buff = MODEL.momentum.weak;
            teamMomentum[t.id] = buff;
        }
    }
}
calculateGroupStageMomentum();

function updateProgressBar(percent) {
    const bar = document.getElementById('sim-progress-bar');
    if (bar) {
        bar.style.width = `${percent}%`;
        if (percent > 0) {
            bar.parentElement.classList.add('active');
        } else {
            bar.parentElement.classList.remove('active');
        }
    }
}

const workerFn = function() {
    let isStopped = false;

    function wcOutrightSim(team1, team2, venue, stageMod) {
        const hkey = (team1.id < team2.id) ? (team1.id + '-' + team2.id) : (team2.id + '-' + team1.id);
        return simulateMatchCore({
            team1, team2, venue, refType: 'Fair (Pierluigi Collina)', stageMod,
            isGroupStage: false, isBacktest: false, usePlayerMicroSim: false,
            t1Momentum: 0, t2Momentum: 0,
            t1FatiguePenalty: 0, t2FatiguePenalty: 0,
            t1RestPenalty: 0, t2RestPenalty: 0,
            t1Susp: false, t2Susp: false,
            t1Dist: 0, t2Dist: 0,
            t1Morale: false, t2Morale: false,
            t1Cinderella: false, t2Cinderella: false,
            isRivalry: checkRivalry(team1.id, team2.id),
            isPolitical: checkPolitical(team1.id, team2.id),
            t1Age: team1.age, t2Age: team2.age,
            h2hEdge: h2hMatrix[hkey] || null
        });
    }

    self.onmessage = function(e) {
        if (e.data.type === 'stop') { isStopped = true; return; }

        if (e.data.type === 'outright') {
            const { r16, qfVenues, sfVenues, fVenue, stageMods, sims, runId } = e.data;
            const champCounts = {};
            for (let s = 0; s < sims; s++) {
                if (isStopped) break;
                const r16Winners = [];
                for (let i = 0; i < 8; i++) {
                    const m = r16[i];
                    r16Winners.push(wcOutrightSim(m.team1, m.team2, m.venue, stageMods.r16).winner);
                }
                const qfWinners = [];
                for (let i = 0; i < 4; i++) {
                    qfWinners.push(wcOutrightSim(r16Winners[i * 2], r16Winners[i * 2 + 1], qfVenues[i], stageMods.qf).winner);
                }
                const sfWinners = [];
                for (let i = 0; i < 2; i++) {
                    sfWinners.push(wcOutrightSim(qfWinners[i * 2], qfWinners[i * 2 + 1], sfVenues[i], stageMods.sf).winner);
                }
                const champ = wcOutrightSim(sfWinners[0], sfWinners[1], fVenue, stageMods.f).winner;
                champCounts[champ.id] = (champCounts[champ.id] || 0) + 1;
            }
            self.postMessage({ type: 'outright-done', runId, champCounts, completed: !isStopped });
            return;
        }

        const {
            team1, team2, venue, runs, t1FatiguePenalty, t2FatiguePenalty, t1Susp, t2Susp,
            t1Dist, t2Dist, t1Morale, t2Morale, isRivalry, t1Cinderella, t2Cinderella,
            isPolitical, refType, t1Age, t2Age, stageMod, isGroupStage, t1Momentum, t2Momentum,
            t1RestPenalty, t2RestPenalty, isBacktest, h2hEdge
        } = e.data;

        let t1Wins = 0, t2Wins = 0, draws = 0;
        let t1TotalInjuries = 0, t2TotalInjuries = 0, t1TotalReds = 0, t2TotalReds = 0;
        let scoreCounts = {};
        let resultCache = null;

        const coreCtx = {
            team1, team2, venue, refType, stageMod, isGroupStage, isBacktest,
            t1Momentum, t2Momentum, t1FatiguePenalty, t2FatiguePenalty,
            t1RestPenalty, t2RestPenalty, t1Susp, t2Susp, t1Dist, t2Dist,
            t1Morale, t2Morale, t1Cinderella, t2Cinderella,
            isRivalry, isPolitical, t1Age, t2Age, h2hEdge
        };

        for (let i = 0; i < runs; i++) {
            if (isStopped) break;
            const result = simulateMatchCore(coreCtx);
            const { score1, score2, pens1, pens2, extraTimePlayed, t1Injured, t2Injured, t1RedCard, t2RedCard, xG1, xG2 } = result;

            if (isGroupStage && score1 === score2) {
                draws++;
            } else {
                const winnerId = (score1 > score2 || (pens1 !== null && pens1 > pens2)) ? team1.id : team2.id;
                if (winnerId === team1.id) t1Wins++; else t2Wins++;
            }
            if (t1Injured) t1TotalInjuries++;
            if (t2Injured) t2TotalInjuries++;
            if (t1RedCard) t1TotalReds++;
            if (t2RedCard) t2TotalReds++;

            let sk = `${score1}-${score2}`;
            if (pens1 !== null) sk += ` (${pens1}p-${pens2}p)`;
            else if (extraTimePlayed) sk += '*';
            scoreCounts[sk] = (scoreCounts[sk] || 0) + 1;
            if (i === 0) resultCache = { xG1, xG2 };
        }
        self.postMessage({ type: 'done', t1Wins, t2Wins, draws, t1TotalInjuries, t2TotalInjuries, t1TotalReds, t2TotalReds, scoreCounts, resultCache });
    };
};

function buildWorkerSource() {
    const sets = (s) => 'new Set(' + JSON.stringify([...s]) + ')';
    const wcCode = (typeof WC_MODEL !== 'undefined') ? WC_MODEL.getWorkerCalibrationCode() : '';
    return [
        'const MODEL = ' + JSON.stringify(MODEL) + ';',
        'const HOST_NATIONS = ' + sets(HOST_NATIONS) + ';',
        'const AMERICAS_TEAMS = ' + sets(AMERICAS_TEAMS) + ';',
        'const h2hMatrix = ' + JSON.stringify(h2hMatrix) + ';',
        wcCode,
        factorial.toString(),
        poissonProbability.toString(),
        dixonColesTau.toString(),
        calculateEloModifier.toString(),
        getVenueContinentModifier.toString(),
        getTacticXGMods.toString(),
        samplePoissonScoreline.toString(),
        checkTacticAdvantage.toString(),
        checkRivalry.toString(),
        checkPolitical.toString(),
        simulateMatchCore.toString(),
        '(' + workerFn.toString() + ')()'
    ].join('\n');
}

let workerUrl;
function initWorkerPool() {
    if (workerUrl) URL.revokeObjectURL(workerUrl);
    const workerBlob = new Blob([buildWorkerSource()], { type: 'application/javascript' });
    workerUrl = URL.createObjectURL(workerBlob);
}


function getDistance(lat1, lon1, lat2, lon2) {
    if(!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
}



function checkPolitical(t1, t2) {
    const pairs = [
        ['usa', 'irn'], ['mar', 'alg'], ['arg', 'eng'],
        ['jpn', 'kor'], ['irq', 'ksa']
    ];
    return pairs.some(p => (p[0]===t1 && p[1]===t2) || (p[0]===t2 && p[1]===t1));
}
const refs = ['Strict (Mateu Lahoz)', 'Lenient (Michael Oliver)', 'VAR Enthusiast', 'Fair (Pierluigi Collina)'];

function checkRivalry(t1, t2) {
    const pairs = [
        ['bra', 'arg'], ['eng', 'ger'], ['usa', 'mex'],
        ['fra', 'eng'], ['esp', 'por'], ['jpn', 'kor'],
        ['fra', 'ger'], ['ned', 'ger'], ['bra', 'uru'],
        ['arg', 'uru'], ['can', 'usa'], ['cro', 'sui']
    ];
    return pairs.some(p => (p[0]===t1 && p[1]===t2) || (p[0]===t2 && p[1]===t1));
}

function checkTacticAdvantage(t1, t2) {
    if (t1 === '4-3-3' && t2 === '5-3-2') return true;
    if (t1 === '5-3-2' && t2 === '4-4-2') return true;
    if (t1 === '4-4-2' && t2 === '3-5-2') return true;
    if (t1 === '3-5-2' && t2 === '4-2-3-1') return true;
    if (t1 === '4-2-3-1' && t2 === '4-3-3') return true;
    return false;
}

function getVenueContinentModifier(teamId, venue) {
    if (!venue || !venue.isHostVenue) return 0;
    if (venue.hostNation === teamId) return MODEL.hostElo;
    if (HOST_NATIONS.has(teamId)) return MODEL.coHostElo;
    if (AMERICAS_TEAMS.has(teamId)) return MODEL.americasElo;
    return 0;
}

function getTacticXGMods(t1Tac, t2Tac) {
    let tacMod1 = 0, tacMod2 = 0, rho = MODEL.rho, totalXGAdjust = 0;
    if (t1Tac === '5-3-2') tacMod1 = -0.35;
    else if (t1Tac === '4-4-2') tacMod1 = -0.15;
    else if (t1Tac === '4-3-3') tacMod1 = 0.25;
    if (t2Tac === '5-3-2') tacMod2 = -0.35;
    else if (t2Tac === '4-4-2') tacMod2 = -0.15;
    else if (t2Tac === '4-3-3') tacMod2 = 0.25;
    totalXGAdjust = tacMod1 + tacMod2;
    const t1Def = t1Tac === '5-3-2' || t1Tac === '4-4-2';
    const t2Def = t2Tac === '5-3-2' || t2Tac === '4-4-2';
    if (t1Def && t2Def) {
        totalXGAdjust -= 0.20;
        rho = -0.10;
    } else if ((t1Tac === '4-3-3' && t2Tac === '5-3-2') || (t1Tac === '5-3-2' && t2Tac === '4-3-3')) {
        totalXGAdjust += 0.15;
        rho = -0.02;
    }
    return { totalXGAdjust, rho };
}

function samplePoissonScoreline(xG1, xG2, rho, maxGoals) {
    let probabilities = [];
    let probTotal = 0;
    for (let i = 0; i <= maxGoals; i++) {
        for (let j = 0; j <= maxGoals; j++) {
            let p = poissonProbability(i, xG1) * poissonProbability(j, xG2) * dixonColesTau(i, j, xG1, xG2, rho);
            p = Math.max(0, p);
            probabilities.push({ score1: i, score2: j, prob: p });
            probTotal += p;
        }
    }
    for (let pi = 0; pi < probabilities.length; pi++) probabilities[pi].prob /= probTotal;
    const rand = Math.random();
    let cumulativeProb = 0;
    let selectedResult = probabilities[probabilities.length - 1];
    for (const probEntry of probabilities) {
        cumulativeProb += probEntry.prob;
        if (rand <= cumulativeProb) { selectedResult = probEntry; break; }
    }
    return selectedResult;
}

function simulateMatchCore(ctx) {
    const {
        team1, team2, venue, refType, stageMod, isGroupStage, isBacktest,
        t1Momentum = 0, t2Momentum = 0,
        t1FatiguePenalty = 0, t2FatiguePenalty = 0,
        t1RestPenalty = 0, t2RestPenalty = 0,
        t1Susp = false, t2Susp = false,
        t1Dist = 0, t2Dist = 0,
        t1Morale = false, t2Morale = false,
        t1Cinderella = false, t2Cinderella = false,
        isRivalry = false, isPolitical = false,
        t1Age = 25, t2Age = 25,
        h2hEdge = null
    } = ctx;

    const rElo1 = (team1.atk * 0.35 + team1.mid * 0.40 + team1.def * 0.25) * 25;
    const rElo2 = (team2.atk * 0.35 + team2.mid * 0.40 + team2.def * 0.25) * 25;
    const eloBlend = MODEL.eloSquadBlend;
    let t1Elo = (team1.elo * eloBlend) + (rElo1 * (1 - eloBlend));
    let t2Elo = (team2.elo * eloBlend) + (rElo2 * (1 - eloBlend));

    let t1Injured = false, t2Injured = false, t1RedCard = false, t2RedCard = false;

    if (!isBacktest) {
        if (!isGroupStage) {
            t1Elo += t1Momentum;
            t2Elo += t2Momentum;
        }
        if (team1.isCustomInjured) t1Elo -= 50;
        if (team2.isCustomInjured) t2Elo -= 50;
        if (venue) {
            t1Elo += calculateEloModifier(team1, venue);
            t2Elo += calculateEloModifier(team2, venue);
        }
        t1Elo += getVenueContinentModifier(team1.id, venue);
        t2Elo += getVenueContinentModifier(team2.id, venue);
        t1Elo -= Math.min(t1FatiguePenalty, MODEL.maxFatigue);
        t2Elo -= Math.min(t2FatiguePenalty, MODEL.maxFatigue);
        t1Elo -= t1RestPenalty;
        t2Elo -= t2RestPenalty;
        if (t1FatiguePenalty >= 30 && t1Age > 28.5) t1Elo -= 15;
        if (t2FatiguePenalty >= 30 && t2Age > 28.5) t2Elo -= 15;
        if (t1Susp) t1Elo -= 40;
        if (t2Susp) t2Elo -= 40;
        if (t1Dist > 0) t1Elo -= Math.floor(t1Dist / 1000) * 5;
        if (t2Dist > 0) t2Elo -= Math.floor(t2Dist / 1000) * 5;
        if (t1Morale) t1Elo += MODEL.moraleBoost;
        if (t2Morale) t2Elo += MODEL.moraleBoost;
        if (t1Cinderella) t1Elo += MODEL.cinderella;
        if (t2Cinderella) t2Elo += MODEL.cinderella;
        if (isRivalry) {
            const diff = t1Elo - t2Elo;
            t1Elo -= diff * MODEL.rivalryCompress;
            t2Elo += diff * MODEL.rivalryCompress;
        }
        if (h2hEdge === team1.id) t1Elo += MODEL.h2h;
        else if (h2hEdge === team2.id) t2Elo += MODEL.h2h;
        if (isPolitical) {
            if (t1Elo < t2Elo) t1Elo += MODEL.political;
            else t2Elo += MODEL.political;
        }
        const safeRef = refType || 'Fair (Pierluigi Collina)';
        let redChance = MODEL.redCardBase;
        if (isRivalry) redChance += 0.02;
        if (isPolitical) redChance += 0.03;
        redChance = Math.min(redChance, 0.15);
        if (safeRef.includes('Strict')) redChance = Math.min(redChance * 2, 0.15);
        else if (safeRef.includes('Lenient')) redChance *= 0.5;
        if (Math.random() < MODEL.injuryChance) { t1Elo -= MODEL.injuryPenalty; t1Injured = true; }
        if (Math.random() < MODEL.injuryChance) { t2Elo -= MODEL.injuryPenalty; t2Injured = true; }
        if (Math.random() < redChance) { t1Elo -= 50; t1RedCard = true; }
        if (Math.random() < redChance) { t2Elo -= 50; t2RedCard = true; }
        if (safeRef.includes('VAR') && Math.random() < MODEL.varChance) {
            if (Math.random() < 0.5) t1Elo += MODEL.varSwing;
            else t2Elo += MODEL.varSwing;
        }
    }

    if (checkTacticAdvantage(team1.tactic, team2.tactic)) t1Elo += MODEL.tactic;
    if (checkTacticAdvantage(team2.tactic, team1.tactic)) t2Elo += MODEL.tactic;

    const eloJitter = isBacktest ? 0 : (Math.random() * MODEL.jitter * 2 - MODEL.jitter);
    const eloDiff = t1Elo - t2Elo + eloJitter;
    const We1 = 1 / (1 + Math.pow(10, -eloDiff / 400));

    const baseXG = isGroupStage ? MODEL.baseXG.group : MODEL.baseXG.knockout;
    let tacMods = getTacticXGMods(team1.tactic, team2.tactic);
    let totalXG = Math.max(0.8, baseXG + (stageMod || 0) + tacMods.totalXGAdjust);

    if (isGroupStage) {
        const defAvg = (team1.def + team2.def + team1.gk + team2.gk) / 4;
        if (defAvg >= 74) {
            totalXG -= MODEL.defensiveDrawXG;
            tacMods = { ...tacMods, rho: Math.min(tacMods.rho, -0.22) };
        }
    }

    const cross1 = (team1.atk * 0.7 + team1.mid * 0.3) / (team2.def * 0.5 + team2.gk * 0.5);
    const cross2 = (team2.atk * 0.7 + team2.mid * 0.3) / (team1.def * 0.5 + team1.gk * 0.5);
    const crossoverProb1 = cross1 / (cross1 + cross2);
    const blendProb1 = We1 * MODEL.xgEloBlend + crossoverProb1 * (1 - MODEL.xgEloBlend);

    const eloLambda1 = Math.max(0.12, totalXG * blendProb1);
    const eloLambda2 = Math.max(0.12, totalXG * (1 - blendProb1));

    let xG1, xG2, squad1, squad2;
    const hasWcWorker = typeof wcComputeLambdas !== 'undefined';
    const hasWcMain = typeof WC_MODEL !== 'undefined';
    const useMicroSim = ctx.usePlayerMicroSim && hasWcMain;

    if (hasWcWorker) {
        const cal = wcComputeLambdas(team1, team2, isGroupStage, eloLambda1, eloLambda2);
        xG1 = cal.lambda1;
        xG2 = cal.lambda2;
        const tacScale = totalXG / (xG1 + xG2);
        xG1 *= tacScale;
        xG2 *= tacScale;
    } else if (hasWcMain) {
        const cal = useMicroSim
            ? WC_MODEL.computeCalibratedLambdas(team1, team2, { ...ctx, eloLambda1, eloLambda2, teamId: team1.id })
            : WC_MODEL.computeCalibratedLambdasFast(team1, team2, { ...ctx, eloLambda1, eloLambda2 });
        xG1 = cal.lambda1;
        xG2 = cal.lambda2;
        squad1 = cal.squad1;
        squad2 = cal.squad2;
        const tacScale = totalXG / (xG1 + xG2);
        xG1 *= tacScale;
        xG2 *= tacScale;
    } else {
        xG1 = eloLambda1;
        xG2 = eloLambda2;
    }

    if (isGroupStage && Math.abs(eloDiff) < MODEL.closeMatchElo) {
        const avg = (xG1 + xG2) / 2;
        const pull = MODEL.closeMatchCompress * (1 - Math.abs(eloDiff) / MODEL.closeMatchElo);
        xG1 = xG1 * (1 - pull) + avg * pull;
        xG2 = xG2 * (1 - pull) + avg * pull;
    } else if (!isGroupStage && Math.abs(eloDiff) < MODEL.knockoutCloseElo) {
        const avg = (xG1 + xG2) / 2;
        const pull = MODEL.knockoutCloseCompress * (1 - Math.abs(eloDiff) / MODEL.knockoutCloseElo);
        xG1 = xG1 * (1 - pull) + avg * pull;
        xG2 = xG2 * (1 - pull) + avg * pull;
    }

    let score1, score2;
    if (useMicroSim && squad1 && squad2) {
        const shotResult = WC_MODEL.simulatePlayerGoals(xG1, xG2, squad1, squad2, 90, true);
        score1 = shotResult.goals1;
        score2 = shotResult.goals2;
    } else {
        const selected = samplePoissonScoreline(xG1, xG2, tacMods.rho, MODEL.maxGoals);
        score1 = selected.score1;
        score2 = selected.score2;
    }
    let pens1 = null, pens2 = null;
    let extraTimePlayed = false;

    if (!isGroupStage && score1 === score2) {
        extraTimePlayed = true;
        const etXG1 = xG1 * 0.25;
        const etXG2 = xG2 * 0.25;
        const etSelected = samplePoissonScoreline(etXG1, etXG2, tacMods.rho, 2);
        score1 += etSelected.score1;
        score2 += etSelected.score2;
        if (score1 === score2) {
            const shootout = simulatePenaltyShootout(team1, team2, eloDiff);
            pens1 = shootout.pens1;
            pens2 = shootout.pens2;
        }
    }

    return {
        score1, score2, pens1, pens2,
        xG1: parseFloat(xG1.toFixed(2)), xG2: parseFloat(xG2.toFixed(2)),
        t1Injured, t2Injured, t1RedCard, t2RedCard, extraTimePlayed,
        squad1, squad2,
        winner: (score1 > score2 || (pens1 !== null && pens1 > pens2)) ? team1 : team2
    };
}

function parseSimulationInput(val) {
    if(!val) return 100000;
    val = val.toString().toLowerCase().trim();
    let multiplier = 1;
    if(val.endsWith('m')) multiplier = 1000000;
    else if(val.endsWith('k')) multiplier = 1000;
    const num = parseInt(val);
    return isNaN(num) ? 100000 : num * multiplier;
}

function teamEditBtn(teamId) {
    return `<button type="button" class="team-edit-btn" data-team-id="${teamId}" title="Customize team" aria-label="Customize team">⋯</button>`;
}

function setMetricCardState(card, score, thresholds) {
    card.classList.remove('is-good', 'is-ok', 'is-poor');
    if (score < thresholds.good) card.classList.add('is-good');
    else if (score < thresholds.ok) card.classList.add('is-ok');
    else card.classList.add('is-poor');
}

document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle initialization
    const themeToggleBtn = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleUI(savedTheme);
    
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeToggleUI(newTheme);
        });
    }
    
    function updateThemeToggleUI(theme) {
        if (themeToggleBtn) {
            const icon = themeToggleBtn.querySelector('.theme-icon');
            if (icon) icon.textContent = theme === 'light' ? '🌙' : '☀️';
            themeToggleBtn.title = theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
        }
    }

    populateInitialR16();
    renderOutrights();
    fetchWeatherForVenues().then(() => {
        renderOutrights();
    });
    initTabs();
    renderGroupStage();
    renderBracket();
    initTooltips();
    
    // Team Customizer Event Listeners
    const closeDrawerBtn = document.getElementById('close-drawer-btn');
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeCustomizer);
    const drawerOverlay = document.getElementById('drawer-overlay');
    if (drawerOverlay) drawerOverlay.addEventListener('click', closeCustomizer);
    
    const eloSlider = document.getElementById('custom-team-elo-slider');
    const eloVal = document.getElementById('custom-team-elo-val');
    if (eloSlider) {
        eloSlider.addEventListener('input', () => { eloVal.innerText = eloSlider.value; });
    }
    
    const ageSlider = document.getElementById('custom-team-age-slider');
    const ageVal = document.getElementById('custom-team-age-val');
    if (ageSlider) {
        ageSlider.addEventListener('input', () => { ageVal.innerText = parseFloat(ageSlider.value).toFixed(1); });
    }

    const atkSlider = document.getElementById('custom-team-atk-slider');
    const atkVal = document.getElementById('custom-team-atk-val');
    if (atkSlider) {
        atkSlider.addEventListener('input', () => { atkVal.innerText = atkSlider.value; });
    }

    const midSlider = document.getElementById('custom-team-mid-slider');
    const midVal = document.getElementById('custom-team-mid-val');
    if (midSlider) {
        midSlider.addEventListener('input', () => { midVal.innerText = midSlider.value; });
    }

    const defSlider = document.getElementById('custom-team-def-slider');
    const defVal = document.getElementById('custom-team-def-val');
    if (defSlider) {
        defSlider.addEventListener('input', () => { defVal.innerText = defSlider.value; });
    }

    const gkSlider = document.getElementById('custom-team-gk-slider');
    const gkVal = document.getElementById('custom-team-gk-val');
    if (gkSlider) {
        gkSlider.addEventListener('input', () => { gkVal.innerText = gkSlider.value; });
    }
    
    const saveCustomTeamBtn = document.getElementById('save-custom-team-btn');
    if (saveCustomTeamBtn) {
        saveCustomTeamBtn.addEventListener('click', () => {
            if (!activeCustomTeamId) return;
            const team = db[activeCustomTeamId];
            team.elo = parseInt(eloSlider.value);
            team.tactic = document.getElementById('custom-team-tactic').value;
            team.age = parseFloat(ageSlider.value);
            team.atk = parseInt(atkSlider.value);
            team.mid = parseInt(midSlider.value);
            team.def = parseInt(defSlider.value);
            team.gk = parseInt(gkSlider.value);
            team.isCustomInjured = document.getElementById('custom-team-injured').checked;
            
            if (typeof WC_MODEL !== 'undefined') WC_MODEL.clearSquadCache();
            closeCustomizer();
            renderBracket();
            renderGroupStage();
            renderOutrights();
            initWorkerPool();
        });
    }
    
    document.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.team-edit-btn');
        if (editBtn?.dataset.teamId) {
            e.stopPropagation();
            openCustomizer(editBtn.dataset.teamId);
        }
    });

    const predict1xBtn = document.getElementById('predict-1x-btn');
    const predictMxBtn = document.getElementById('predict-mx-btn');
    const simInput = document.getElementById('sim-count');
    const resetBtn = document.getElementById('reset-btn');

    predict1xBtn.addEventListener('click', () => {
        disableButtons();
        predict1xBtn.textContent = "Running…";
        setTimeout(() => {
            runAIPredictions(1);
        }, 50);
    });

    predictMxBtn.addEventListener('click', () => {
        const count = parseSimulationInput(simInput.value);
        if (count > 5000000) {
            if (!confirm(`Warning: You requested ${count.toLocaleString()} simulations per match. This may take significant time/CPU. Proceed?`)) {
                return;
            }
        }
        simInput.value = count;
        
        isSimulationCancelled = false;
        disableButtons();
        predictMxBtn.hidden = true;
        document.getElementById('stop-btn').hidden = false;
        document.getElementById('stop-btn').textContent = 'Stop';
        
        runAIPredictions(count);
    });

    document.getElementById('stop-btn').addEventListener('click', () => {
        isSimulationCancelled = true;
        document.getElementById('stop-btn').textContent = 'Stopping…';
        activeWorkers.forEach(w => w.terminate());
        activeWorkers = [];
        cancelOutrightWorkers();
        if (resolveCurrentSimulation) {
            resolveCurrentSimulation(null);
            resolveCurrentSimulation = null;
        }
    });

    resetBtn.addEventListener('click', () => {
        resetPredictions();
    });

    // Model Accuracy Backtesting UI Bindings
    const runBacktestBtn = document.getElementById('run-backtest-btn');
    if (runBacktestBtn) {
        runBacktestBtn.addEventListener('click', async () => {
            const selectVal = parseInt(document.getElementById('backtest-runs').value) || 1000;
            runBacktestBtn.disabled = true;
            runBacktestBtn.textContent = "Running…";
            
            const progressContainer = document.getElementById('backtest-progress-container');
            const progressBar = document.getElementById('backtest-progress-bar');
            const metricsGrid = document.getElementById('metrics-grid');
            const resultsLayout = document.getElementById('results-layout');
            
            progressContainer.hidden = false;
            progressBar.style.width = '0%';
            metricsGrid.hidden = true;
            resultsLayout.hidden = true;
            
            const result = await window.runModelBacktestAsync(selectVal, (percent) => {
                progressBar.style.width = `${percent}%`;
            });
            
            if (!result) {
                runBacktestBtn.disabled = false;
                runBacktestBtn.textContent = "Run backtest";
                return;
            }
            
            const finalBrier = result.brierScore;
            const finalLogLoss = result.avgLogLoss;
            const finalAccuracy = result.accuracy;
            const summary = result.summary || {};
            const groupStats = summary.group || {};
            const koStats = summary.knockout || {};
            
            document.getElementById('brier-val').textContent = finalBrier.toFixed(4);
            document.getElementById('logloss-val').textContent = finalLogLoss.toFixed(4);
            document.getElementById('accuracy-val').textContent = (finalAccuracy * 100).toFixed(1) + "%";
            document.getElementById('group-accuracy-val').textContent = groupStats.accuracy != null
                ? (groupStats.accuracy * 100).toFixed(1) + "%"
                : "-";
            document.getElementById('ko-accuracy-val').textContent = koStats.accuracy != null
                ? (koStats.accuracy * 100).toFixed(1) + "%"
                : "-";
            document.getElementById('group-accuracy-desc').textContent = `${groupStats.count || 72} matches · Brier ${groupStats.brierScore != null ? groupStats.brierScore.toFixed(3) : "-"}`;
            document.getElementById('ko-accuracy-desc').textContent = `${koStats.count || 16} matches · Brier ${koStats.brierScore != null ? koStats.brierScore.toFixed(3) : "-"}`;

            const calPill = document.getElementById('calibration-mode-pill');
            if (calPill) {
                calPill.textContent = result.calibrationMode === 'live' ? 'Live (leaked)' : 'Pre-tournament';
            }
            
            setMetricCardState(document.getElementById('brier-card'), finalBrier, { good: 0.22, ok: 0.30 });
            setMetricCardState(document.getElementById('logloss-card'), finalLogLoss, { good: 1.0, ok: 1.2 });

            const missesEl = document.getElementById('backtest-misses');
            const missesList = document.getElementById('backtest-misses-list');
            if (missesEl && missesList && result.biggestMisses) {
                missesList.innerHTML = '';
                result.biggestMisses.forEach(res => {
                    const li = document.createElement('li');
                    const actualText = res.match.type === 'group'
                        ? (res.match.actual === 1 ? `${res.team1.name} win` : (res.match.actual === 0 ? 'Draw' : `${res.team2.name} win`))
                        : (res.match.actual === 1 ? `${res.team1.name} win` : `${res.team2.name} win`);
                    const topProb = Math.max(res.p1, res.pDraw, res.p2);
                    li.textContent = `${res.team1.name} vs ${res.team2.name} — actual: ${actualText} (${res.match.score1}-${res.match.score2}) · model gave ${(topProb * 100).toFixed(0)}% to wrong call`;
                    missesList.appendChild(li);
                });
                missesEl.hidden = result.biggestMisses.length === 0;
            }

            const tbody = document.getElementById('backtest-results-tbody');
            tbody.innerHTML = '';
            
            result.matchResults.forEach(res => {
                const tr = document.createElement('tr');
                const matchText = `${res.team1.flag} ${res.team1.name} vs ${res.team2.name} ${res.team2.flag}`;
                const isCorrectHtml = res.isCorrect
                    ? '<span class="pred-correct">Correct</span>'
                    : '<span class="pred-wrong">Miss</span>';
                
                let actualResultText = "";
                if (res.match.type === 'group') {
                    actualResultText = res.match.actual === 1 ? `Win ${res.team1.name}` : (res.match.actual === 0 ? "Draw" : `Win ${res.team2.name}`);
                } else {
                    actualResultText = res.match.actual === 1 ? `Win ${res.team1.name}` : `Win ${res.team2.name}`;
                }
                
                tr.innerHTML = `
                    <td>${matchText}</td>
                    <td>${res.match.type}</td>
                    <td><strong>${actualResultText}</strong> (${res.match.score1}-${res.match.score2}${res.match.pens1 ? ` [${res.match.pens1}p-${res.match.pens2}p]` : ''})</td>
                    <td>${(res.p1 * 100).toFixed(1)}%</td>
                    <td>${(res.pDraw * 100).toFixed(1)}%</td>
                    <td>${(res.p2 * 100).toFixed(1)}%</td>
                    <td>${res.matchBrier.toFixed(4)}</td>
                    <td>${isCorrectHtml}</td>
                `;
                tbody.appendChild(tr);
            });
            
            progressContainer.hidden = true;
            metricsGrid.hidden = false;
            if (document.getElementById('backtest-misses')) {
                document.getElementById('backtest-misses').hidden = !result.biggestMisses?.length;
            }
            resultsLayout.hidden = false;
            
            runBacktestBtn.disabled = false;
            runBacktestBtn.textContent = "Run backtest";
        });
    }
});

function disableButtons() {
    document.getElementById('predict-1x-btn').disabled = true;
    document.getElementById('predict-mx-btn').disabled = true;
    document.getElementById('sim-count').disabled = true;
    document.getElementById('reset-btn').disabled = true;
}

function enableButtons() {
    const b1 = document.getElementById('predict-1x-btn');
    b1.disabled = false;
    b1.textContent = "Quick sim";
    
    const b2 = document.getElementById('predict-mx-btn');
    b2.disabled = false;
    b2.hidden = false;
    
    document.getElementById('stop-btn').hidden = true;
    
    document.getElementById('sim-count').disabled = false;
    document.getElementById('reset-btn').disabled = false;
}

async function fetchWeatherForVenues() {
    for (let venue of venues) {
        if (venue.isIndoor) {
            venue.temp = 21;
            venue.weather = 'Indoor AC (21°C)';
            venue.hostileTo = []; venue.buffTo = [];
            continue;
        }
        try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${venue.lat}&longitude=${venue.lon}&current_weather=true`);
            const data = await res.json();
            const temp = data.current_weather.temperature;
            venue.temp = temp;
            
            if (temp > 30) {
                venue.weather = `Extreme Heat (${temp}°C)`;
                venue.hostileTo = ['mild']; venue.buffTo = ['humid', 'heat'];
            } else if (temp < 15) {
                venue.weather = `Cool/Cold (${temp}°C)`;
                venue.hostileTo = ['heat', 'humid']; venue.buffTo = ['mild'];
            } else {
                venue.weather = `Mild/Warm (${temp}°C)`;
                venue.hostileTo = []; venue.buffTo = ['versatile'];
            }
        } catch(e) {
            venue.temp = 25;
            venue.weather = `Fallback (${venue.temp}°C)`;
            venue.hostileTo = []; venue.buffTo = [];
        }
    }
}

const PAGE_SUBTITLES = {
    'group-stage': 'Final standings from the opening round',
    'knockout-stage': 'Round of 16 through final',
    'simulation-logs': 'Per-match breakdown from the latest run',
    'simulation-rules': 'Math and modifiers behind each prediction',
    'model-accuracy': 'Backtest against 88 completed matches'
};

function initTabs() {
    const tabBtns = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const menuToggle = document.getElementById('menu-toggle');

    function closeSidebar() {
        sidebar?.classList.remove('is-open');
        if (backdrop) {
            backdrop.classList.remove('is-visible');
            backdrop.hidden = true;
        }
    }

    function openSidebar() {
        sidebar?.classList.add('is-open');
        if (backdrop) {
            backdrop.hidden = false;
            requestAnimationFrame(() => backdrop.classList.add('is-visible'));
        }
    }

    menuToggle?.addEventListener('click', () => {
        if (sidebar?.classList.contains('is-open')) closeSidebar();
        else openSidebar();
    });

    backdrop?.addEventListener('click', closeSidebar);

    function activateTab(btn) {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab)?.classList.add('active');
        if (pageTitle) pageTitle.textContent = btn.dataset.title || btn.textContent.trim();
        if (pageSubtitle) pageSubtitle.textContent = PAGE_SUBTITLES[btn.dataset.tab] || '';
        closeSidebar();
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => activateTab(btn));
    });
}

function renderKnockoutMeta() {
    const el = document.getElementById('knockout-meta');
    if (!el) return;

    let teamsInR16 = 0;
    bracketData.r16.forEach(m => {
        if (m.team1) teamsInR16++;
        if (m.team2) teamsInR16++;
    });

    let predicted = 0;
    ['r16', 'qf', 'sf', 'f'].forEach(round => {
        bracketData[round].forEach(m => { if (m.winner) predicted++; });
    });
    const remaining = Math.max(0, 15 - predicted);

    let chips = `<span class="meta-chip"><strong>${teamsInR16}</strong> in R16</span>`;
    chips += `<span class="meta-chip${remaining > 0 && remaining < 15 ? ' meta-chip--live' : ''}"><strong>${remaining}</strong> to simulate</span>`;
    if (bracketData.champion) {
        chips += `<span class="meta-chip meta-chip--live"><strong>🏆</strong> ${bracketData.champion.name}</span>`;
    }
    el.innerHTML = chips;
}

function renderGroupStage() {
    const container = document.getElementById('groups-container');
    container.innerHTML = '';
    
    let groupIndex = 0;
    for (const [groupName, teamsList] of Object.entries(groupData)) {
        const card = document.createElement('div');
        card.className = 'group-card';
        card.style.animationDelay = `${groupIndex * 0.04}s`;
        
        let rows = '';
        teamsList.forEach((tData, rank) => {
            const team = db[tData.id];
            const advanced = bracketData.r32.some(m => m.team1.id === team.id || m.team2.id === team.id);
            const statusClass = advanced ? 'advanced' : 'eliminated';
            const leaderClass = rank === 0 ? ' leader' : '';
            
            rows += `<tr class="team-row ${statusClass}${leaderClass}" data-team-id="${team.id}">
                    <td><div class="team-info"><span class="team-flag">${team.flag}</span><span class="team-name-sm">${team.name}</span>${teamEditBtn(team.id)}</div></td>
                    <td>${tData.w + tData.d + tData.l}</td>
                    <td>${tData.w}</td><td>${tData.d}</td><td>${tData.l}</td>
                    <td>${tData.gd > 0 ? '+'+tData.gd : tData.gd}</td>
                    <td>${tData.pts}</td>
                </tr>`;
        });
        card.innerHTML = `<div class="group-header"><span class="group-letter">${groupName}</span> Group ${groupName}</div><table class="group-table"><thead><tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead><tbody>${rows}</tbody></table>`;
        container.appendChild(card);
        groupIndex++;
    }
}

function populateInitialR16() {
    bracketData.r32.forEach(match => {
        const nextDest = nextMatchMap[match.id];
        bracketData[nextDest.round][nextDest.index][nextDest.slot] = match.winner;
    });
}

function renderBracket() {
    renderRound('r32', 'r32-matches'); renderRound('r16', 'r16-matches');
    renderRound('qf', 'qf-matches'); renderRound('sf', 'sf-matches');
    renderRound('f', 'f-matches'); renderChampion();
    renderKnockoutMeta();
}

function renderRound(roundKey, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    bracketData[roundKey].forEach((match, index) => {
        const matchEl = document.createElement('div');
        matchEl.className = 'match' + (match.type === 'ai' ? ' match--ai' : '');
        matchEl.dataset.matchId = match.id;
        matchEl.style.animationDelay = `${index * 0.035}s`;
        let metaHtml = '';
        if (match.type === 'ai' && match.venue) {
            const weather = match.venue.weather && match.venue.weather !== 'Loading...'
                ? `<span class="match-weather">${match.venue.weather}</span>` : '';
            metaHtml = `<div class="match-meta"><span class="match-venue">${match.venue.city}</span>${weather}</div>`;
        }
        matchEl.innerHTML = `
            ${metaHtml}
            ${createTeamHtml(match.team1, match.winner, match.type, match.score1, match.pens1, match.t1Perc, match, true)}
            ${createTeamHtml(match.team2, match.winner, match.type, match.score2, match.pens2, match.t2Perc, match, false)}
        `;
        container.appendChild(matchEl);
    });
}

function createTeamHtml(team, winner, winType, score, pens, perc, match, isTeam1) {
    if (!team) return `<div class="match-team empty"><div class="match-team-left"><span class="team-name-sm">TBD</span></div><div class="match-team-score">-</div></div>`;
    let winnerClass = '';
    if (winner && winner.id === team.id) winnerClass = winType === 'ai' ? 'winner-ai' : 'winner-actual';
    let displayScore = (score != null) ? score : '-';
    let displayPens = (pens != null) ? `<span class="penalty-text">(${pens})</span>` : '';
    let displayPerc = perc ? `<span class="perc-text">${perc}%</span>` : '';
    
    let badgesHtml = '';
    if (match && match.type === 'ai') {
        const is1x = match.t1Perc === null || match.t1Perc === undefined;
        const myInj = isTeam1 ? (is1x ? match.t1Injured : (match.t1Injuries > 0)) : (is1x ? match.t2Injured : (match.t2Injuries > 0));
        const myRed = isTeam1 ? (is1x ? match.t1RedCard : (match.t1Reds > 0)) : (is1x ? match.t2RedCard : (match.t2Reds > 0));
        
        if (myInj) {
            badgesHtml += `<span class="badge-item" title="🚑 Key player injured">🚑</span>`;
        }
        if (myRed) {
            badgesHtml += `<span class="badge-item" title="🟥 Red card occurred">🟥</span>`;
        }
        
        const opponent = isTeam1 ? match.team2 : match.team1;
        if (opponent) {
            if (checkRivalry(team.id, opponent.id)) {
                badgesHtml += `<span class="badge-item" title="⚔️ Historic Rivalry Match">⚔️</span>`;
            }
            if (checkPolitical(team.id, opponent.id)) {
                badgesHtml += `<span class="badge-item" title="🚨 Geopolitical Tension">🚨</span>`;
            }
            if (match.venue && match.venue.hostileTo.includes(team.climate)) {
                badgesHtml += `<span class="badge-item" title="⛈️ Climate Adaptation Penalty (${match.venue.weather})">⛈️</span>`;
            }
        }
    }
    
    return `<div class="match-team ${winnerClass}" data-team-id="${team.id}">
            <div class="match-team-left">
                <span class="team-flag-sm">${team.flag}</span>
                <span class="team-name-sm">${team.name} ${displayPens}</span>
                ${teamEditBtn(team.id)}
                ${displayPerc}
                <div class="match-badges">${badgesHtml}</div>
            </div>
            <div class="match-team-score">${displayScore}</div>
        </div>`;
}

function renderChampion() {
    const box = document.getElementById('champion-box');
    if (bracketData.champion) {
        box.innerHTML = `<div class="champion-content"><span class="champion-flag">${bracketData.champion.flag}</span><h4>${bracketData.champion.name}</h4><span class="champion-label">Predicted champion</span></div>`;
    } else {
        box.innerHTML = `<div class="champion-placeholder"><span class="champion-trophy" aria-hidden="true">🏆</span><span class="champion-hint">Awaiting simulation</span></div>`;
    }
}

// Tooltips (Includes Environmental & Injury Data)
function initTooltips() {
    const tooltip = document.getElementById('tooltip');
    document.getElementById('knockout-stage').addEventListener('mouseover', (e) => {
        const matchEl = e.target.closest('.match');
        const teamEl = e.target.closest('.match-team:not(.empty)');
        if (matchEl && teamEl) {
            const teamId = teamEl.dataset.teamId;
            const matchId = matchEl.dataset.matchId;
            const team = db[teamId];
            
            let matchData = null;
            ['r32', 'r16', 'qf', 'sf', 'f'].forEach(r => {
                const f = bracketData[r].find(m => m.id === matchId);
                if (f) matchData = f;
            });
            
            let envText = '';
            let xGText = '';
            
            if (matchData && matchData.venue && matchData.type === 'ai') {
                const venue = matchData.venue;
                let eloMod = calculateEloModifier(team, venue);
                let modString = eloMod === 0 ? 'No impact' : (eloMod > 0 ? `<span style="color:var(--win-green)">+${eloMod}</span>` : `<span style="color:var(--elim-red)">${eloMod}</span>`);
                
                let fatigueText = (teamFatigue[team.id] || 0) > 0 ? `<div class="tooltip-stat"><span>Fatigue Penalty:</span> <strong style="color:var(--elim-red)">-${teamFatigue[team.id]} Elo</strong></div>` : '';
                const homeMod = getVenueContinentModifier(team.id, venue);
                let homeText = homeMod > 0 ? `<div class="tooltip-stat"><span>Host Region:</span> <strong style="color:var(--win-green)">+${homeMod} Elo</strong></div>` : '';
                let suspText = suspendedTeams.has(team.id) ? `<div class="tooltip-stat"><span>Suspension Penalty:</span> <strong style="color:var(--elim-red)">-40 Elo</strong></div>` : '';
                
                let tDist = getDistance(teamLastVenue[team.id]?.lat, teamLastVenue[team.id]?.lon, venue.lat, venue.lon);
                let distText = tDist > 0 ? `<div class="tooltip-stat"><span>Travel Distance:</span> <strong style="color:var(--elim-red)">${tDist} km (-${Math.floor(tDist/1000)*5} Elo)</strong></div>` : '';
                let moraleText = highMoraleTeams.has(team.id) ? `<div class="tooltip-stat"><span>Form:</span> <strong style="color:var(--win-green)">High Morale (+10 Elo)</strong></div>` : '';
                
                let isTeam1 = matchData.team1.id === team.id;
                let opponent = isTeam1 ? matchData.team2 : matchData.team1;
                let hasTacAdv = checkTacticAdvantage(team.tactic, opponent.tactic);
                let tacText = `<div class="tooltip-stat"><span>Formation:</span> <strong style="color:var(--brand-gold)">${team.tactic}</strong></div>`;
                if(hasTacAdv) tacText += `<div class="tooltip-stat"><span>Tactical Counter:</span> <strong style="color:var(--win-green)">+${MODEL.tactic} Elo</strong> vs ${opponent.tactic}</div>`;


                envText = `
                    <div class="tooltip-divider"></div>
                    <div class="tooltip-stat"><span>Venue:</span> <strong class="text-blue">${venue.city}</strong></div>
                    <div class="tooltip-stat"><span>Live Weather:</span> <strong>${venue.weather}</strong></div>
                    <div class="tooltip-stat"><span>Weather Elo Mod:</span> <strong>${modString}</strong></div>
                    ${homeText}
                    ${fatigueText}
                    ${suspText}
                    ${distText}
                    ${moraleText}
                    ${cinderellaTeams.has(team.id) ? `<div class="tooltip-stat"><span>Form:</span> <strong style="color:var(--brand-gold)">Cinderella Story (+${MODEL.cinderella} Elo)</strong></div>` : ''}
                    ${(h2hMatrix[(matchData.team1.id < matchData.team2.id) ? (matchData.team1.id+'-'+matchData.team2.id) : (matchData.team2.id+'-'+matchData.team1.id)] === team.id) ? `<div class="tooltip-stat"><span>History:</span> <strong style="color:var(--win-green)">Mental Edge (+${MODEL.h2h} Elo)</strong></div>` : ''}
                    ${((teamFatigue[team.id] || 0) >= 30 && team.age > 28.5) ? `<div class="tooltip-stat"><span>Aging Core:</span> <strong style="color:var(--elim-red)">Physical Collapse (-15 Elo)</strong></div>` : ''}
                    <div class="tooltip-divider"></div>
                    ${checkRivalry(matchData.team1.id, matchData.team2.id) ? `<div class="tooltip-stat"><strong style="color:var(--elim-red)">⚔️ HISTORIC RIVALRY MATCH</strong></div>` : ''}
                    ${checkPolitical(matchData.team1.id, matchData.team2.id) ? `<div class="tooltip-stat"><strong style="color:var(--elim-red)">🚨 HIGH TENSION: GEOPOLITICAL RISK</strong></div>` : ''}
                    <div class="tooltip-stat" style="margin-top: 5px;"><span>Referee:</span> <strong>${matchData.refType || 'Unknown'}</strong></div>
                    ${tacText}
                `;
            }

            if (matchData && matchData.xG1 !== null && matchData.type === 'ai') {
                const isTeam1 = matchData.team1.id === teamId;
                const myXG = isTeam1 ? matchData.xG1 : matchData.xG2;
                xGText = `
                    <div class="tooltip-divider"></div>
                    <div class="tooltip-stat"><span>Simulated xG:</span> <strong style="color:var(--brand-gold)">${myXG}</strong></div>
                `;
            }
            
            let ratingText = '';
            if (typeof WC_MODEL !== 'undefined' && WC_MODEL.teamAttack[team.id] !== undefined) {
                const atkR = WC_MODEL.teamAttack[team.id].toFixed(2);
                const defR = WC_MODEL.teamDefense[team.id].toFixed(2);
                ratingText = `<div class="tooltip-stat"><span>WC fitted rating:</span> <strong style="color:var(--accent)">ATK ${atkR} / DEF ${defR}</strong></div>`;
            }
            let baseStats = `
                <div class="tooltip-header">${team.flag} ${team.name}</div>
                <div class="tooltip-stat"><span>Base Elo:</span> <strong>${team.elo}</strong></div>
                <div class="tooltip-stat"><span>Squad Strength:</span> <strong style="color:var(--brand-gold)">⚔️ ${team.atk} ATK | 🛡️ ${team.def} DEF</strong></div>
                <div class="tooltip-stat"><span>Control / GK:</span> <strong>⚙️ ${team.mid} MID | 🧤 ${team.gk} GK</strong></div>
                ${ratingText}
                <div class="tooltip-stat"><span>Key Players:</span> <strong style="color:var(--brand-teal)">${team.stars ? team.stars.slice(0,3).join(', ') : 'Squad'}</strong></div>
                <div class="tooltip-stat"><span>Climate DNA:</span> <strong>${team.climate}</strong></div>
            `;

            tooltip.innerHTML = baseStats + envText + xGText;
            tooltip.classList.remove('hidden');
        }
    });
    document.getElementById('knockout-stage').addEventListener('mousemove', (e) => {
        const tooltipRect = tooltip.getBoundingClientRect();
        let left = e.pageX + 15;
        let top = e.pageY + 15;
        if (left + 290 > window.scrollX + window.innerWidth) left = e.pageX - 305;
        if (top + (tooltipRect.height || 300) > window.scrollY + window.innerHeight) top = e.pageY - (tooltipRect.height || 300) - 15;
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    });
    document.getElementById('knockout-stage').addEventListener('mouseout', (e) => {
        const matchTeam = e.target.closest('.match-team');
        if (matchTeam && !matchTeam.contains(e.relatedTarget)) {
            tooltip.classList.add('hidden');
        }
    });
}

// --- REALITY ENGINE MATH ---
function factorial(n) {
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
}

function poissonProbability(k, lambda) {
    const e = Math.exp(-lambda);
    const numerator = Math.pow(lambda, k);
    const denominator = factorial(k);
    return (numerator * e) / denominator;
}

function calculateEloModifier(team, venue) {
    if (!venue || !venue.hostileTo) return 0;
    let mod = 0;
    if(venue.hostileTo.includes(team.climate)) mod -= 35;
    if(venue.buffTo.includes(team.climate) && team.climate !== 'versatile') mod += 20;
    // Altitude: Mexico City (2240m) — unadapted teams suffer
    if(venue.altitude && venue.altitude > 1800) {
        if(!['mex','usa','can'].includes(team.id) && team.climate !== 'versatile') mod -= 25;
    }
    return mod;
}

const extraSquadPlayers = {
    'arg': ['R. De Paul', 'E. Fernández', 'N. Molina', 'N. Otamendi', 'G. Montiel', 'C. Romero', 'E. Martínez'],
    'fra': ['A. Tchouaméni', 'M. Thuram', 'J. Koundé', 'T. Hernández', 'D. Upamecano', 'N. Kanté', 'B. Barcola'],
    'esp': ['Dani Olmo', 'Fabián Ruiz', 'Mikel Oyarzabal', 'Aymeric Laporte', 'Pau Cubarsí', 'Mikel Merino', 'Álex Grimaldo'],
    'eng': ['Eberechi Eze', 'Marcus Rashford', 'Ollie Watkins', 'Noni Madueke', 'John Stones', 'Anthony Gordon', 'Marc Guéhi'],
    'bra': ['Bruno Guimarães', 'Gabriel Magalhães', 'Marquinhos', 'Danilo', 'Endrick', 'Alisson', 'Casemiro'],
    'por': ['João Neves', 'Vitinha', 'Bernardo Silva', 'Gonçalo Ramos', 'Diogo Costa', 'Nuno Mendes', 'João Cancelo'],
    'col': ['Richard Ríos', 'Jhon Arias', 'Jhon Lucumí', 'Yohan Mojica', 'Davinson Sánchez', 'Yerry Mina', 'David Ospina'],
    'ger': ['Nico Schlotterbeck', 'Deniz Undav', 'Leroy Sané', 'Leon Goretzka', 'Antonio Rüdiger', 'Jonathan Tah', 'David Raum'],
    'ned': ['Tijjani Reijnders', 'Ryan Gravenberch', 'Donyell Malen', 'Wout Weghorst', 'Nathan Aké', 'Jurriën Timber', 'D. Dumfries'],
    'cro': ['Mario Pašalić', 'Luka Sučić', 'Ante Budimir', 'Josip Šutalo', 'Ivan Perišić', 'Nikola Vlašić', 'Dominik Livaković'],
    'uru': ['Rodrigo Bentancur', 'Facundo Pellistri', 'Giorgian de Arrascaeta', 'José María Giménez', 'Mathías Olivera', 'M. Viña'],
    'usa': ['Timothy Weah', 'Gio Reyna', 'Ricardo Pepi', 'Sergiño Dest', 'Antonee Robinson', 'Chris Richards', 'Miles Robinson'],
    'mex': ['Raúl Jiménez', 'Guillermo Ochoa', 'Orbelín Pineda', 'Julián Quiñones', 'Johan Vásquez', 'Jorge Sánchez', 'Alexis Vega']
};
window.extraSquadPlayers = extraSquadPlayers;

function generateGoalscorers(team, goalCount, isET, squad) {
    if (goalCount <= 0) return [];
    let events = [];
    const stars = team.stars || [];
    const extra = extraSquadPlayers[team.id] || [];

    const pickFromSquad = () => {
        if (squad && squad.players) {
            const scorers = squad.players.filter(p => p.minutes > 0 && p.role !== 'gk');
            const total = scorers.reduce((s, p) => s + p.shotWeight, 0);
            let r = Math.random() * total;
            for (const p of scorers) {
                r -= p.shotWeight;
                if (r <= 0) return p.name;
            }
            if (scorers.length) return scorers[0].name;
        }
        const rand = Math.random();
        if (rand < 0.40 && stars.length > 0) return stars[0];
        if (rand < 0.65 && stars.length > 1) return stars[1];
        if (rand < 0.80 && stars.length > 2) return stars[2];
        if (rand < 0.90 && stars.length > 3) return stars[3];
        if (extra.length > 0) return extra[Math.floor(Math.random() * extra.length)];
        if (stars.length > 0) return stars[Math.floor(Math.random() * stars.length)];
        return 'Squad Player';
    };

    for (let i = 0; i < goalCount; i++) {
        const min = isET
            ? Math.floor(Math.random() * 30) + 91
            : Math.floor(Math.random() * 90) + 1;
        events.push({ scorer: pickFromSquad(), minute: min });
    }

    events.sort((a, b) => a.minute - b.minute);
    return events;
}

function simulatePenaltyShootout(team1, team2, eloDiff) {
    if (typeof WC_MODEL !== 'undefined' && WC_MODEL.simulatePenaltyShootout) {
        return WC_MODEL.simulatePenaltyShootout(team1, team2, eloDiff);
    }
    const baseConv = 0.755;
    let p1 = 0, p2 = 0;
    for (let k = 0; k < 5; k++) {
        if (Math.random() < baseConv) p1++;
        if (Math.random() < baseConv) p2++;
    }
    while (p1 === p2) {
        if (Math.random() < baseConv) p1++;
        if (Math.random() < baseConv) p2++;
        if (p1 !== p2) break;
        p1++;
    }
    return { pens1: p1, pens2: p2 };
}

// Dixon-Coles correction factor (rho = -0.06 fitted from WC data)
function dixonColesTau(s1, s2, xG1, xG2, rho) {
    if (s1 === 0 && s2 === 0) return 1 - xG1 * xG2 * rho;
    if (s1 === 1 && s2 === 0) return 1 + xG2 * rho;
    if (s1 === 0 && s2 === 1) return 1 + xG1 * rho;
    if (s1 === 1 && s2 === 1) return 1 - rho;
    return 1;
}

// Simulates a single match instance (used by 1x and outright odds)
function simulateMatchStats(team1, team2, venue, refType, stageMod, isGroupStage, t1RestPenalty, t2RestPenalty, isBacktest, usePlayerMicroSim) {
    const hkey = (team1.id < team2.id) ? (team1.id + '-' + team2.id) : (team2.id + '-' + team1.id);
    const h2hEdge = h2hMatrix[hkey] || null;
    return simulateMatchCore({
        team1, team2, venue, refType, stageMod: stageMod || 0, isGroupStage, isBacktest,
        usePlayerMicroSim: usePlayerMicroSim !== false && !isBacktest,
        t1Momentum: isGroupStage ? 0 : (teamMomentum[team1.id] || 0),
        t2Momentum: isGroupStage ? 0 : (teamMomentum[team2.id] || 0),
        t1FatiguePenalty: teamFatigue[team1.id] || 0,
        t2FatiguePenalty: teamFatigue[team2.id] || 0,
        t1RestPenalty: t1RestPenalty || 0,
        t2RestPenalty: t2RestPenalty || 0,
        t1Susp: suspendedTeams.has(team1.id),
        t2Susp: suspendedTeams.has(team2.id),
        t1Dist: getDistance(teamLastVenue[team1.id]?.lat, teamLastVenue[team1.id]?.lon, venue?.lat, venue?.lon),
        t2Dist: getDistance(teamLastVenue[team2.id]?.lat, teamLastVenue[team2.id]?.lon, venue?.lat, venue?.lon),
        t1Morale: highMoraleTeams.has(team1.id),
        t2Morale: highMoraleTeams.has(team2.id),
        t1Cinderella: cinderellaTeams.has(team1.id),
        t2Cinderella: cinderellaTeams.has(team2.id),
        isRivalry: checkRivalry(team1.id, team2.id),
        isPolitical: checkPolitical(team1.id, team2.id),
        t1Age: team1.age,
        t2Age: team2.age,
        h2hEdge
    });
}

async function simulateMonteCarlo(team1, team2, venue, runs, refType, stageMod, isGroupStage, t1RestPenalty, t2RestPenalty, isBacktest) {
    if (runs === 0) runs = 1;
    return new Promise((resolve) => {
        resolveCurrentSimulation = resolve;
        const cores = navigator.hardwareConcurrency || 4;
        let runsLeft = runs;
        let completedWorkers = 0;
        let activeWorkersCount = 0;
        
        let totalT1Wins = 0, totalT2Wins = 0, totalDraws = 0;
        let totalT1Injuries = 0, totalT2Injuries = 0, totalT1Reds = 0, totalT2Reds = 0;
        let totalScoreCounts = {};
        let finalResultCache = null;
        let totalProcessedRuns = 0;
        
        activeWorkers = [];

        let workersToSpawn = [];
        for(let i=0; i<cores; i++) {
            let actualRuns = Math.ceil(runsLeft / (cores - i));
            runsLeft -= actualRuns;
            if(actualRuns <= 0) continue;
            workersToSpawn.push(actualRuns);
        }
        activeWorkersCount = workersToSpawn.length;

        if (activeWorkersCount === 0) {
            resolve(processMonteCarloResults(team1, team2, venue, 0, 0, 0, 0, 0, 0, 0, 0, {}, null));
            return;
        }

        workersToSpawn.forEach((actualRuns) => {
            const worker = new Worker(workerUrl);
            activeWorkers.push(worker);
            
            worker.onmessage = (e) => {
                if(e.data.type === 'done') {
                    const d = e.data;
                    totalT1Wins += d.t1Wins; totalT2Wins += d.t2Wins;
                    totalDraws += (d.draws || 0);
                    totalT1Injuries += d.t1TotalInjuries; totalT2Injuries += d.t2TotalInjuries;
                    totalT1Reds += d.t1TotalReds; totalT2Reds += d.t2TotalReds;
                    totalProcessedRuns += (d.t1Wins + d.t2Wins + (d.draws || 0));
                    
                    for(const [k, v] of Object.entries(d.scoreCounts)) { totalScoreCounts[k] = (totalScoreCounts[k] || 0) + v; }
                    if(!finalResultCache) finalResultCache = d.resultCache;
                    
                    completedWorkers++;
                    worker.terminate(); // cleanup
                    
                    if(completedWorkers === activeWorkersCount) {
                        resolveCurrentSimulation = null;
                        resolve(processMonteCarloResults(team1, team2, venue, totalProcessedRuns, totalT1Wins, totalT2Wins, totalDraws, totalT1Injuries, totalT2Injuries, totalT1Reds, totalT2Reds, totalScoreCounts, finalResultCache));
                    }
                }
            };
            
            let t1Dist = getDistance(teamLastVenue[team1.id]?.lat, teamLastVenue[team1.id]?.lon, venue?.lat, venue?.lon);
            let t2Dist = getDistance(teamLastVenue[team2.id]?.lat, teamLastVenue[team2.id]?.lon, venue?.lat, venue?.lon);
            const hkey = (team1.id < team2.id) ? (team1.id + '-' + team2.id) : (team2.id + '-' + team1.id);
            worker.postMessage({
                team1, team2, venue, runs: actualRuns,
                t1FatiguePenalty: Math.min(teamFatigue[team1.id] || 0, 60),
                t2FatiguePenalty: Math.min(teamFatigue[team2.id] || 0, 60),
                t1Susp: suspendedTeams.has(team1.id), t2Susp: suspendedTeams.has(team2.id),
                t1Dist, t2Dist, t1Morale: highMoraleTeams.has(team1.id), t2Morale: highMoraleTeams.has(team2.id),
                isRivalry: checkRivalry(team1.id, team2.id),
                isPolitical: checkPolitical(team1.id, team2.id),
                refType: refType,
                t1Age: team1.age, t2Age: team2.age,
                t1Cinderella: cinderellaTeams.has(team1.id), t2Cinderella: cinderellaTeams.has(team2.id),
                stageMod: stageMod,
                isGroupStage: isGroupStage || false,
                t1Momentum: !isGroupStage ? (teamMomentum[team1.id] || 0) : 0,
                t2Momentum: !isGroupStage ? (teamMomentum[team2.id] || 0) : 0,
                t1RestPenalty: t1RestPenalty || 0,
                t2RestPenalty: t2RestPenalty || 0,
                isBacktest: isBacktest || false,
                h2hEdge: h2hMatrix[hkey] || null
            });
        });
    });
}

function processMonteCarloResults(team1, team2, venue, runs, t1Wins, t2Wins, draws, t1TotalInjuries, t2TotalInjuries, t1TotalReds, t2TotalReds, scoreCounts, resultCache) {
    if(runs === 0) runs = 1; // fallback if stopped instantly
    let maxCount = 0;
    let modeScoreKey = '';
    for(const [key, count] of Object.entries(scoreCounts)) {
        if(count > maxCount) { maxCount = count; modeScoreKey = key; }
    }

    let finalWinner = t1Wins > t2Wins ? team1 : (t2Wins > t1Wins ? team2 : (team1.elo >= team2.elo ? team1 : team2));
    let s1 = 0, s2 = 0, p1 = null, p2 = null;
    let extraTimePlayed = false;
    let pensPlayed = false;
    
    if(modeScoreKey) {
        if (modeScoreKey.includes('p')) {
            extraTimePlayed = true;
            pensPlayed = true;
        } else if (modeScoreKey.includes('*')) {
            extraTimePlayed = true;
        }

        let cleanScore = modeScoreKey.replace('*', '');
        if (cleanScore.includes('(')) {
            cleanScore = cleanScore.split(' ')[0];
        }
        const parts = cleanScore.split('-');
        s1 = parseInt(parts[0]); s2 = parseInt(parts[1]);
        if(pensPlayed) {
            const penMatch = modeScoreKey.match(/\((\d+)p-(\d+)p\)/);
            const mp1 = penMatch ? parseInt(penMatch[1]) : 4;
            const mp2 = penMatch ? parseInt(penMatch[2]) : 5;
            if(finalWinner.id === team1.id) {
                p1 = Math.max(mp1, mp2);
                p2 = Math.min(mp1, mp2);
                if (p1 === p2) p1 += 1;
            } else {
                p1 = Math.min(mp1, mp2);
                p2 = Math.max(mp1, mp2);
                if (p1 === p2) p2 += 1;
            }
        } else {
            if(finalWinner.id === team1.id && s1 <= s2) { s1 = s2 + 1; }
            if(finalWinner.id === team2.id && s2 <= s1) { s2 = s1 + 1; }
        }
    }

    simulationLogs.push({
        team1: team1, team2: team2, venue: venue,
        t1Wins: t1Wins, t2Wins: t2Wins,
        t1Injuries: t1TotalInjuries, t2Injuries: t2TotalInjuries,
        t1Reds: t1TotalReds, t2Reds: t2TotalReds,
        totalRuns: runs,
        modeScore: modeScoreKey,
        advancing: finalWinner
    });

    return {
        score1: s1, score2: s2, pens1: p1, pens2: p2,
        xG1: resultCache ? resultCache.xG1 : 0, xG2: resultCache ? resultCache.xG2 : 0, 
        t1Perc: ((t1Wins / runs) * 100).toFixed(1),
        t2Perc: ((t2Wins / runs) * 100).toFixed(1),
        t1Injuries: t1TotalInjuries,
        t2Injuries: t2TotalInjuries,
        t1Reds: t1TotalReds,
        t2Reds: t2TotalReds,
        totalRuns: runs,
        winner: finalWinner,
        extraTimePlayed,
        pensPlayed,
        t1Wins,
        t2Wins,
        draws
    };
}

// AI Engine Loop
async function runAIPredictions(runs) {
    isSimulationCancelled = false;
    completedMatchupsCount = 0;
    updateProgressBar(0);
    document.getElementById('timer-text').innerText = '';
    const startTime = performance.now();
    
    simulationLogs = []; // clear logs
    resetNarrativeState(); // ensure each run starts from a clean narrative slate
    const roundsToPredict = ['r16', 'qf', 'sf', 'f'];
    
    for (const round of roundsToPredict) {
        if (isSimulationCancelled) break;
        await predictRound(round, runs, stagePressure[round] || 0);
        // Yellows reset after the quarter-finals: SF and F begin with a clean card slate.
        if (round === 'qf') {
            yellowCardsAccumulated = {};
            suspendedTeams.clear();
        }
    }
    
    const endTime = performance.now();
    enableButtons();
    
    if (isSimulationCancelled) {
        resetPredictions();
        document.getElementById('timer-text').innerText = 'Simulation stopped — bracket reset.';
        updateProgressBar(0);
    } else {
        document.getElementById('timer-text').innerText = `Completed in ${((endTime - startTime)/1000).toFixed(2)}s`;
        updateProgressBar(100);
        triggerConfetti();
        renderLogs();
        renderOutrights();
    }
}

async function predictRound(roundKey, runs, stageMod) {
    stageMod = stageMod || 0;
    const matches = bracketData[roundKey];
    for (const match of matches) {
        if (isSimulationCancelled) break;
        if (!match.team1 || !match.team2) continue;
        
        match.refType = refs[Math.floor(Math.random() * refs.length)];
        match.stageMod = stageMod;
        
        const currentDay = matchDays[match.id] || 1;
        const lastPlay1 = teamLastPlayDay[match.team1.id];
        const restDays1 = lastPlay1 ? (currentDay - lastPlay1) : 4;
        const t1RestPenalty = restDays1 < 4 ? (4 - restDays1) * 15 : 0;
        
        const lastPlay2 = teamLastPlayDay[match.team2.id];
        const restDays2 = lastPlay2 ? (currentDay - lastPlay2) : 4;
        const t2RestPenalty = restDays2 < 4 ? (4 - restDays2) * 15 : 0;
        
        let result;
        if(runs === 1) {
            result = simulateMatchStats(match.team1, match.team2, match.venue, match.refType, stageMod, false, t1RestPenalty, t2RestPenalty);
            
            // For 1x run, log it so the user can see if injuries happened
            simulationLogs.push({
                team1: match.team1, team2: match.team2, venue: match.venue,
                t1Wins: result.winner.id === match.team1.id ? 1 : 0, 
                t2Wins: result.winner.id === match.team2.id ? 1 : 0,
                t1Injuries: result.t1Injured ? 1 : 0, 
                t2Injuries: result.t2Injured ? 1 : 0,
                t1Reds: result.t1RedCard ? 1 : 0,
                t2Reds: result.t2RedCard ? 1 : 0,
                totalRuns: 1, modeScore: `${result.score1}-${result.score2}${result.pens1 ? ' (p)' : ''}`,
                advancing: result.winner
            });
            match.t1Perc = null;
            match.t2Perc = null;
            match.t1Injured = result.t1Injured;
            match.t2Injured = result.t2Injured;
            match.t1RedCard = result.t1RedCard;
            match.t2RedCard = result.t2RedCard;
        } else {
            result = await simulateMonteCarlo(match.team1, match.team2, match.venue, runs, match.refType, stageMod, false, t1RestPenalty, t2RestPenalty);
            if (!result || isSimulationCancelled) {
                break;
            }
            match.t1Perc = result.t1Perc;
            match.t2Perc = result.t2Perc;
            match.t1Injuries = result.t1Injuries;
            match.t2Injuries = result.t2Injuries;
            match.t1Reds = result.t1Reds;
            match.t2Reds = result.t2Reds;
            match.totalRuns = result.totalRuns;
        }
        
        teamLastPlayDay[result.winner.id] = currentDay;
        
        // Tiered fatigue: accumulate based on how hard the match was using explicit flags
        let fatigueGain = 0;
        if (result.pens1 !== null || result.pensPlayed) {
            fatigueGain = 45; // penalties: heavy fatigue
        } else if (result.extraTimePlayed) {
            fatigueGain = 30; // extra time but no pens
        } else if (Math.abs(result.score1 - result.score2) <= 1) {
            fatigueGain = 10; // tight 90-min win
        } else {
            fatigueGain = 0; // comfortable win, full recovery
        }
        teamFatigue[result.winner.id] = Math.min((teamFatigue[result.winner.id] || 0) + fatigueGain, 60);
        
        let isRiv = checkRivalry(match.team1.id, match.team2.id);
        let pickedUpYellow = Math.random() < (isRiv ? 0.25 : 0.12);
        if (pickedUpYellow) {
            yellowCardsAccumulated[result.winner.id] = (yellowCardsAccumulated[result.winner.id] || 0) + 1;
        }
        if (yellowCardsAccumulated[result.winner.id] >= 2) {
            suspendedTeams.add(result.winner.id);
            yellowCardsAccumulated[result.winner.id] = 0;
        } else {
            suspendedTeams.delete(result.winner.id);
        }
        
        teamLastVenue[result.winner.id] = match.venue;
        if(Math.abs(result.score1 - result.score2) >= 3 && result.pens1 === null) {
            highMoraleTeams.add(result.winner.id);
        } else {
            highMoraleTeams.delete(result.winner.id);
        }
        
        let loser = result.winner.id === match.team1.id ? match.team2 : match.team1;
        const effEloWinner = result.winner.elo - (teamFatigue[result.winner.id] || 0) + calculateEloModifier(result.winner, match.venue);
        const effEloLoser = loser.elo - (teamFatigue[loser.id] || 0) + calculateEloModifier(loser, match.venue);
        if(effEloWinner < 1780 && effEloLoser > 1920) {
            cinderellaTeams.add(result.winner.id);
        } else {
            cinderellaTeams.delete(result.winner.id);
        }
        
        match.winner = result.winner;
        match.score1 = result.score1; match.score2 = result.score2;
        match.pens1 = result.pens1; match.pens2 = result.pens2;
        match.xG1 = result.xG1; match.xG2 = result.xG2;
        match.type = 'ai'; 

        // Generate goalscorer events for canon match representation
        let goals1RT = result.score1;
        let goals1ET = 0;
        let goals2RT = result.score2;
        let goals2ET = 0;
        
        if (result.extraTimePlayed) {
            const drawScore = Math.min(result.score1, result.score2);
            goals1RT = drawScore;
            goals1ET = Math.max(0, result.score1 - drawScore);
            goals2RT = drawScore;
            goals2ET = Math.max(0, result.score2 - drawScore);
        }
        
        match.goals1 = [
            ...generateGoalscorers(match.team1, goals1RT, false, result.squad1),
            ...generateGoalscorers(match.team1, goals1ET, true, result.squad1)
        ];
        match.goals2 = [
            ...generateGoalscorers(match.team2, goals2RT, false, result.squad2),
            ...generateGoalscorers(match.team2, goals2ET, true, result.squad2)
        ]; 
        
        const nextDest = nextMatchMap[match.id];
        if (nextDest.round === 'champion') { bracketData.champion = result.winner; } 
        else { bracketData[nextDest.round][nextDest.index][nextDest.slot] = result.winner; }
        
        completedMatchupsCount++;
        updateProgressBar((completedMatchupsCount / 15) * 100);
    }
    renderBracket();
}

function renderLogs() {
    const container = document.getElementById('logs-container');
    container.innerHTML = '';
    if(simulationLogs.length === 0) {
        container.innerHTML = '<p class="empty-state">Run a simulation to see matchup breakdowns.</p>';
        return;
    }

    simulationLogs.forEach((log, index) => {
        const card = document.createElement('div');
        card.className = 'log-card';
        card.style.animationDelay = `${index * 0.05}s`;
        const t1Perc = ((log.t1Wins / log.totalRuns) * 100).toFixed(1);
        const t2Perc = ((log.t2Wins / log.totalRuns) * 100).toFixed(1);
        
        // Injury text logic
        let injText1 = '', injText2 = '';
        if(log.totalRuns === 1) {
            if(log.t1Injuries > 0) injText1 += ' <span class="text-orange" title="Key player injured during match!">(🚑)</span>';
            if(log.t2Injuries > 0) injText2 += ' <span class="text-orange" title="Key player injured during match!">(🚑)</span>';
            if(log.t1Reds > 0) injText1 += ' <span style="color:var(--elim-red)" title="Red Card!">(🟥)</span>';
            if(log.t2Reds > 0) injText2 += ' <span style="color:var(--elim-red)" title="Red Card!">(🟥)</span>';
        } else {
            const i1Perc = ((log.t1Injuries / log.totalRuns) * 100).toFixed(0);
            const i2Perc = ((log.t2Injuries / log.totalRuns) * 100).toFixed(0);
            const r1Perc = ((log.t1Reds / log.totalRuns) * 100).toFixed(0);
            const r2Perc = ((log.t2Reds / log.totalRuns) * 100).toFixed(0);
            injText1 = ` <span class="text-muted" style="font-size:0.8rem">(${i1Perc}% 🚑 | ${r1Perc}% 🟥)</span>`;
            injText2 = ` <span class="text-muted" style="font-size:0.8rem">(${i2Perc}% 🚑 | ${r2Perc}% 🟥)</span>`;
        }
        
        let displayScoreline = log.modeScore || '';
        if (displayScoreline.includes('*')) {
            displayScoreline = displayScoreline.replace('*', '') + ' (AET)';
        }

        let matchObj = null;
        ['r16', 'qf', 'sf', 'f'].forEach(r => {
            const found = bracketData[r].find(m => m.team1 && m.team2 && 
                ((m.team1.id === log.team1.id && m.team2.id === log.team2.id) || 
                 (m.team1.id === log.team2.id && m.team2.id === log.team1.id)));
            if (found) matchObj = found;
        });

        let goalsHtml = '';
        if (matchObj && ((matchObj.goals1 && matchObj.goals1.length > 0) || (matchObj.goals2 && matchObj.goals2.length > 0))) {
            let g1 = (matchObj.goals1 || []).map(g => `${g.scorer} ${g.minute}'`).join(', ');
            let g2 = (matchObj.goals2 || []).map(g => `${g.scorer} ${g.minute}'`).join(', ');
            
            goalsHtml = `
                <div class="log-goals-list">
                    ${g1 ? `<div>⚽ <strong>${log.team1.name}</strong>: ${g1}</div>` : ''}
                    ${g2 ? `<div>⚽ <strong>${log.team2.name}</strong>: ${g2}</div>` : ''}
                </div>
            `;
        }

        const t1WinnerClass = log.advancing.id === log.team1.id ? ' is-winner' : '';
        const t2WinnerClass = log.advancing.id === log.team2.id ? ' is-winner' : '';

        card.innerHTML = `
            <h3>
                <span>Match ${index + 1}</span>
                <span class="log-venue">📍 ${log.venue.city} · ${log.venue.weather}</span>
            </h3>
            <div class="log-details">
                <div class="log-details-row">
                    <div class="log-teams">
                        <div class="log-team-row">
                            <span class="team-flag-sm">${log.team1.flag}</span>
                            <span class="log-team-name${t1WinnerClass}">${log.team1.name}</span>
                            <span class="log-win-perc">${t1Perc}%</span>
                            ${log.totalRuns > 1 ? `<div class="log-win-bar-wrapper"><div class="log-win-bar" style="width: ${t1Perc}%"></div></div>` : ''}
                            ${injText1}
                        </div>
                        <div class="log-team-row">
                            <span class="team-flag-sm">${log.team2.flag}</span>
                            <span class="log-team-name${t2WinnerClass}">${log.team2.name}</span>
                            <span class="log-win-perc">${t2Perc}%</span>
                            ${log.totalRuns > 1 ? `<div class="log-win-bar-wrapper"><div class="log-win-bar" style="width: ${t2Perc}%"></div></div>` : ''}
                            ${injText2}
                        </div>
                    </div>
                    <div class="log-stats">
                        <div>Advancing <strong>${log.advancing.name}</strong></div>
                        <div>Scoreline <strong>${displayScoreline}</strong></div>
                    </div>
                </div>
                ${goalsHtml}
            </div>
        `;
        container.appendChild(card);
    });
}

function resetNarrativeState() {
    teamFatigue = {};
    teamLastVenue = {};
    teamLastPlayDay = {};
    yellowCardsAccumulated = {};
    suspendedTeams.clear();
    highMoraleTeams.clear();
    cinderellaTeams.clear();
}

function cancelOutrightWorkers() {
    outrightRunId++;              // invalidate any in-flight results
    outrightWorkers.forEach(w => w.terminate());
    outrightWorkers = [];
}

function resetPredictions() {
    isSimulationCancelled = false;
    completedMatchupsCount = 0;
    updateProgressBar(0);
    document.getElementById('timer-text').innerText = '';
    // Clear all predicted matches
    ['r16', 'qf', 'sf', 'f'].forEach(round => {
        bracketData[round].forEach(m => {
            m.winner = null;
            m.score1 = null; m.score2 = null; m.pens1 = null; m.pens2 = null; m.xG1 = null; m.xG2 = null; m.t1Perc = null; m.t2Perc = null;
            if (round !== 'r16') { m.team1 = null; m.team2 = null; }
            if (round !== 'f') { m.venue = getRandomVenue(); }
        });
    });
    bracketData.champion = null;
    simulationLogs = [];
    resetNarrativeState();
    cancelOutrightWorkers();
    renderLogs();
    renderBracket();
    renderOutrights();
    enableButtons();
}

function triggerConfetti() {
    if (typeof confetti !== 'undefined') {
        var duration = 2000; var end = Date.now() + duration;
        (function frame() {
            confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#10b981', '#f59e0b', '#fafafa'] });
            confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#10b981', '#f59e0b', '#fafafa'] });
            if (Date.now() < end) requestAnimationFrame(frame);
        }());
    }
}
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// Outrights Odds & Customizer Logic
let activeCustomTeamId = null;

let outrightRunId = 0;
let outrightWorkers = [];

function calculateOutrightOdds() {
    const activeTeams = [];
    bracketData.r16.forEach(m => {
        if (m.team1) activeTeams.push(m.team1);
        if (m.team2) activeTeams.push(m.team2);
    });

    if (activeTeams.length < 16) return Promise.resolve(null);

    const r16 = bracketData.r16.map(m => ({ team1: m.team1, team2: m.team2, venue: m.venue }));
    const qfVenues = bracketData.qf.map(m => m.venue);
    const sfVenues = bracketData.sf.map(m => m.venue);
    const fVenue = bracketData.f[0].venue;
    const stageMods = { r16: stagePressure['r16'], qf: stagePressure['qf'], sf: stagePressure['sf'], f: stagePressure['f'] };

    const sims = 3000;
    const cores = navigator.hardwareConcurrency || 4;
    const perCore = Math.ceil(sims / cores);

    return new Promise((resolve) => {
        if (!workerUrl) initWorkerPool();
        const runId = ++outrightRunId;
        outrightWorkers.forEach(w => w.terminate());
        outrightWorkers = [];

        const champCounts = {};
        activeTeams.forEach(t => champCounts[t.id] = 0);

        const buildLeaderboard = (counts, totalSims) => {
            const board = Object.entries(counts).map(([teamId, count]) => {
                return {
                    team: db[teamId],
                    prob: ((count / totalSims) * 100).toFixed(1),
                    rawCount: count
                };
            }).sort((a, b) => b.rawCount - a.rawCount);
            board.forEach(o => delete o.rawCount);
            return board;
        };

        let completed = 0;
        let spawned = 0;
        const spawn = () => {
            const worker = new Worker(workerUrl);
            outrightWorkers.push(worker);
            worker.onmessage = (e) => {
                if (e.data.type !== 'outright-done' || e.data.runId !== runId) return;
                if (e.data.completed) {
                    for (const [id, c] of Object.entries(e.data.champCounts)) {
                        champCounts[id] = (champCounts[id] || 0) + c;
                    }
                }
                completed++;
                worker.terminate();
                outrightWorkers = outrightWorkers.filter(w => w !== worker);
                if (completed === spawned) {
                    resolve(buildLeaderboard(champCounts, sims));
                }
            };
            worker.onerror = () => {
                completed++;
                worker.terminate();
                outrightWorkers = outrightWorkers.filter(w => w !== worker);
                if (completed === spawned) resolve(buildLeaderboard(champCounts, sims));
            };
            worker.postMessage({
                type: 'outright', runId, r16, qfVenues, sfVenues, fVenue, stageMods, sims: perCore
            });
            spawned++;
        };

        for (let i = 0; i < cores; i++) spawn();
    });
}

function renderOutrights() {
    const list = document.getElementById('outrights-list');
    if (!list) return;

    list.innerHTML = '<p class="empty-state loading-pulse">Calculating odds…</p>';

    calculateOutrightOdds().then((odds) => {
        if (!odds) {
            list.innerHTML = '<p class="empty-state">Round of 16 not ready.</p>';
            return;
        }

        list.innerHTML = '';
        const maxProb = parseFloat(odds[0]?.prob) || 1;
        odds.slice(0, 10).forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'outright-item';
            row.dataset.teamId = item.team.id;
            const barWidth = (parseFloat(item.prob) / maxProb) * 100;
            row.innerHTML = `
                <span class="outright-rank">${index + 1}</span>
                <div class="outright-body">
                    <div class="outright-item-left">
                        <span class="outright-item-flag">${item.team.flag}</span>
                        <span class="outright-item-name">${item.team.name}</span>
                        ${teamEditBtn(item.team.id)}
                    </div>
                    <div class="outright-bar"><div class="outright-bar-fill" style="width: ${barWidth}%"></div></div>
                </div>
                <span class="outright-item-prob">${item.prob}%</span>
            `;
            list.appendChild(row);
        });
    });
}

function openCustomizer(teamId) {
    const team = db[teamId];
    if (!team) return;
    activeCustomTeamId = teamId;
    
    document.getElementById('custom-team-title').innerHTML = `${team.flag} ${team.name}`;
    
    const eloSlider = document.getElementById('custom-team-elo-slider');
    const eloVal = document.getElementById('custom-team-elo-val');
    eloSlider.value = team.elo;
    eloVal.innerText = team.elo;
    
    const tacticSelect = document.getElementById('custom-team-tactic');
    tacticSelect.value = team.tactic || '4-2-3-1';
    
    const ageSlider = document.getElementById('custom-team-age-slider');
    const ageVal = document.getElementById('custom-team-age-val');
    ageSlider.value = team.age || 26.0;
    ageVal.innerText = (team.age || 26.0).toFixed(1);
    
    const atkSlider = document.getElementById('custom-team-atk-slider');
    const atkVal = document.getElementById('custom-team-atk-val');
    atkSlider.value = team.atk || 75;
    atkVal.innerText = team.atk || 75;
    
    const midSlider = document.getElementById('custom-team-mid-slider');
    const midVal = document.getElementById('custom-team-mid-val');
    midSlider.value = team.mid || 75;
    midVal.innerText = team.mid || 75;
    
    const defSlider = document.getElementById('custom-team-def-slider');
    const defVal = document.getElementById('custom-team-def-val');
    defSlider.value = team.def || 75;
    defVal.innerText = team.def || 75;
    
    const gkSlider = document.getElementById('custom-team-gk-slider');
    const gkVal = document.getElementById('custom-team-gk-val');
    gkSlider.value = team.gk || 75;
    gkVal.innerText = team.gk || 75;
    
    const injuredToggle = document.getElementById('custom-team-injured');
    injuredToggle.checked = team.isCustomInjured || false;
    
    document.getElementById('customizer-drawer').classList.add('active');
    const overlay = document.getElementById('drawer-overlay');
    if (overlay) {
        overlay.hidden = false;
        requestAnimationFrame(() => overlay.classList.add('is-visible'));
    }
}

function closeCustomizer() {
    document.getElementById('customizer-drawer').classList.remove('active');
    const overlay = document.getElementById('drawer-overlay');
    if (overlay) {
        overlay.classList.remove('is-visible');
        setTimeout(() => { overlay.hidden = true; }, 300);
    }
    activeCustomTeamId = null;
}

if (typeof WC_MODEL !== 'undefined') {
    WC_MODEL.applyEloPriors(db);
    WC_MODEL.clearSquadCache();
}
initWorkerPool();

// Export database and simulation helpers to global window for backtest.js accessibility
window.db = db;
window.MODEL = MODEL;
window.simulateMatchStats = simulateMatchStats;
window.simulateMonteCarlo = simulateMonteCarlo;
window.initWorkerPool = initWorkerPool;

