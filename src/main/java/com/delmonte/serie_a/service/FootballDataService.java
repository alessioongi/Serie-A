package com.delmonte.serie_a.service;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

import java.util.Optional;
import java.util.List;
import java.util.ArrayList;
import java.util.Arrays;
import jakarta.annotation.PostConstruct;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.delmonte.serie_a.models.Team;
import com.delmonte.serie_a.repository.TeamRepo;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class FootballDataService {
    @Value("${FOOTBALL_DATA_API_KEY}")
    private String apiKey;
    
    @Value("${RAPIDAPI_KEYS:}")
    private String rapidApiRawKeys;
    
    @Value("${RAPIDAPI_HOST:api-football-v1.p.rapidapi.com}")
    private String rapidApiHost;
    
    @Value("${RAPIDAPI_LEAGUE_ID:55}")
    private String defaultLeagueId;
    
    private List<String> rapidApiKeys = new ArrayList<>();
    private int currentKeyIndex = 0;

    @PostConstruct
    public void init() {
        if (rapidApiRawKeys != null && !rapidApiRawKeys.isEmpty()) {
            rapidApiKeys = Arrays.asList(rapidApiRawKeys.split(","));
            System.out.println("DEBUG: Sistema di rotazione pronto con " + rapidApiKeys.size() + " chiave/i.");
        }
    }
    
    @Autowired
    private TeamRepo teamRepo;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Mappatura codici Football-Data.org -> ID RapidAPI
    private String getRapidApiLeagueId(String competitionCode) {
        return switch (competitionCode) {
            case "SA" -> "55";  // Serie A (confermato dall'utente)
            case "PL" -> "39";  // Premier League
            case "BL1" -> "78"; // Bundesliga
            case "PD" -> "140"; // La Liga
            case "FL1" -> "61"; // Ligue 1
            default -> defaultLeagueId;
        };
    }

    public String getStandings(){
        String url = "https://api.football-data.org/v4/competitions/SA/standings";
        return callFootballDataApi(url);
    }

    public String getMatches(Integer season) {
        String url = "https://api.football-data.org/v4/competitions/SA/matches";
        if (season != null) {
            url += "?season=" + season;
        }
        return callFootballDataApi(url);
    }

    public String getScorers(){
        String url = "https://api.football-data.org/v4/competitions/SA/scorers";
        return callFootballDataApi(url);
    }
    
    public String getAllLeagues() {
        try {
            String url = "https://" + rapidApiHost + "/football-get-all-leagues";
            return callRapidApi(url);
        } catch (Exception e) {
            return "{\"error\": \"Failed to fetch leagues: " + e.getMessage() + "\"}";
        }
    }

    public String getMatchDetails(int matchId) {
        try {
            // 1. Info da Football-Data (per nomi squadre e data)
            String fdUrl = "https://api.football-data.org/v4/matches/" + matchId;
            String fdResponse = callFootballDataApi(fdUrl);
            JsonNode fdRoot = objectMapper.readTree(fdResponse);

            if (fdRoot.isMissingNode() || fdRoot.has("errorCode")) {
                return "{\"error\": \"Match non trovato su Football-Data\"}";
            }

            String homeTeam = fdRoot.path("homeTeam").path("shortName").asText(fdRoot.path("homeTeam").path("name").asText());
            String awayTeam = fdRoot.path("awayTeam").path("shortName").asText(fdRoot.path("awayTeam").path("name").asText());
            String utcDate = fdRoot.path("utcDate").asText();
            String date = utcDate.substring(0, 10);

            System.out.println("DEBUG: Cerco su RapidAPI: " + homeTeam + " vs " + awayTeam + " in data " + date);

            // 2. Cerco il match su RapidAPI usando la DATA
            String rapidUrl = "https://" + rapidApiHost + "/football-get-matches-by-date?date=" + date;
            String rapidResponse = callRapidApi(rapidUrl);
            
            // Verifichiamo se abbiamo una risposta valida con matches
            boolean hasMatches = false;
            try {
                JsonNode res = objectMapper.readTree(rapidResponse);
                if (res.has("response") && res.path("response").has("matches")) {
                    hasMatches = true;
                }
            } catch (Exception e) {}

            // Se la ricerca per data fallisce o non ha il formato atteso, provo con League ID (Fallback)
            if (!hasMatches || rapidResponse.contains("\"status\":\"failed\"")) {
                System.out.println("DEBUG: Ricerca per data fallita o nessun match trovato, provo con League ID 55...");
                String leagueId = getRapidApiLeagueId(fdRoot.path("competition").path("code").asText("SA"));
                rapidUrl = "https://" + rapidApiHost + "/football-get-all-matches-by-league?leagueid=" + leagueId;
                rapidResponse = callRapidApi(rapidUrl);
            }

            // Se la risposta è comunque null o vuota, restituiamo un oggetto vuoto valido
            if (rapidResponse == null || rapidResponse.trim().isEmpty()) {
                return "{\"status\":\"success\",\"response\":{\"matches\":[]}}";
            }

            return rapidResponse;

        } catch (Exception e) {
            return "{\"error\": \"Errore ricerca match: " + e.getMessage() + "\"}";
        }
    }

    public String getMatchStatistics(String eventId) {
        String url = "https://" + rapidApiHost + "/football-get-match-event-all-stats?eventid=" + eventId;
        return callRapidApi(url);
    }

    public String getExternalMatchDetails(String externalMatchId) {
        String url = "https://" + rapidApiHost + "/football-get-match-event-all-stats?eventid=" + externalMatchId;
        return callRapidApi(url);
    }

    private boolean isSameMatch(String fdHome, String fdAway, String sHome, String sAway) {
        return (checkName(fdHome, sHome) && checkName(fdAway, sAway)) || 
               (checkName(fdHome, sAway) && checkName(fdAway, sHome));
    }

    private boolean checkName(String fdName, String sName) {
        String n1 = simplify(fdName);
        String n2 = simplify(sName);
        if (n1.contains(n2) || n2.contains(n1)) return true;
        String s1 = n1.length() > 3 ? n1.substring(0, 3) : n1;
        String s2 = n2.length() > 3 ? n2.substring(0, 3) : n2;
        return s1.equals(s2);
    }

    private String simplify(String name) {
        if (name == null) return "";
        return name.toLowerCase()
                .replace("internazionale milano", "inter")
                .replace("internazionale", "inter")
                .replace("milano", "")
                .replace("fc", "")
                .replace("ac", "")
                .replace("as", "")
                .replace("ssc", "")
                .replace("us", "")
                .replace("cfc", "")
                .replace("hellas", "")
                .replace("juve", "juventus")
                .replace("ssl", "lazio")
                .replace("calcio", "")
                .replace("1900", "")
                .replace("1907", "")
                .replace("1908", "")
                .replace("1909", "")
                .replace("1926", "")
                .replace(" ", "")
                .trim();
    }

    private String callRapidApi(String url) {
        if (rapidApiKeys.isEmpty()) {
            return "{\"error\": \"Nessuna chiave RapidAPI configurata\"}";
        }

        int attempts = 0;
        while (attempts < rapidApiKeys.size()) {
            String currentKey = rapidApiKeys.get(currentKeyIndex).trim();
            HttpHeaders headers = new HttpHeaders();
            headers.set("x-rapidapi-key", currentKey);
            headers.set("x-rapidapi-host", rapidApiHost);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            try {
                System.out.println("DEBUG: Tento chiamata con chiave #" + (currentKeyIndex + 1));
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
                String body = response.getBody();

                if (body != null && (body.contains("\"message\":\"You are not subscribed to this API\"") || 
                             body.contains("Too Many Requests") || 
                             body.contains("Request Failed Please try Again"))) {
                    System.err.println("ATTENZIONE: Chiave #" + (currentKeyIndex + 1) + " non autorizzata, esaurita o errore temporaneo. Ruoto...");
                    currentKeyIndex = (currentKeyIndex + 1) % rapidApiKeys.size();
                    attempts++;
                    continue;
                }

                if (body != null && body.contains("\"status\":\"failed\"")) {
                    System.err.println("AVVISO: Chiave #" + (currentKeyIndex + 1) + " errore logico persistente: " + body);
                    return body;
                }

                System.out.println("DEBUG: Chiamata riuscita con Chiave #" + (currentKeyIndex + 1));
                return body;
            } catch (Exception e) {
                String error = e.getMessage();
                if (error != null && (error.contains("429") || error.contains("403") || error.contains("Too Many Requests"))) {
                    System.err.println("ATTENZIONE: Chiave #" + (currentKeyIndex + 1) + " esaurita o non disponibile. Ruoto...");
                    currentKeyIndex = (currentKeyIndex + 1) % rapidApiKeys.size();
                    attempts++;
                } else {
                    return "{\"error\": \"RapidAPI call failed: " + error + "\"}";
                }
            }
        }
        return "{\"error\": \"Tutte le chiavi API sono state esaurite (429)\"}";
    }

    private String callFootballDataApi(String url) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Auth-Token", apiKey);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            return response.getBody();
        } catch (Exception e) {
            String safeError = e.getMessage().replace("\"", "'").replace("\n", " ");
            return "{\"error\": \"Football-Data API call failed: " + safeError + "\"}";
        }
    }

    public boolean checkSyncStatus(){
        try{
            String jsonResponse = getStandings();
            JsonNode root = objectMapper.readTree(jsonResponse);
            JsonNode standings = root.path("standings").get(0).path("table");
            for(JsonNode row : standings){
                String teamName = row.path("team").path("shortName").asText();
                int apiPoints = row.path("points").asInt();
                
                Optional<Team> teamOpt = teamRepo.findAll().stream()
                    .filter(t -> t.getName() != null && (
                        t.getName().equalsIgnoreCase(teamName) || 
                        teamName.contains(t.getName()) || 
                        t.getName().contains(teamName)
                    ))
                    .findFirst();

                if(teamOpt.isPresent()){
                    if (teamOpt.get().getPoints() != apiPoints) {
                        return false;
                    }
                }
            }
            return true;
        }catch(Exception e){
            return true;
        }
    }

    public String updateStandings(){
        try{
            String jsonResponse = getStandings();
            JsonNode root = objectMapper.readTree(jsonResponse);
            JsonNode standings = root.path("standings").get(0).path("table");
            int count = 0;
            for(JsonNode row : standings){
                String teamName = row.path("team").path("shortName").asText();
                int points = row.path("points").asInt();
                String logoUrl=row.path("team").path("crest").asText();
                
                Optional<Team> teamOpt = teamRepo.findAll().stream()
                    .filter(t -> t.getName() != null && (
                        t.getName().equalsIgnoreCase(teamName) || 
                        teamName.contains(t.getName()) || 
                        t.getName().contains(teamName)
                    ))
                    .findFirst();

                if(teamOpt.isPresent()){
                    Team team = teamOpt.get();
                    team.setPoints(points);
                    team.setLogoUrl(logoUrl);
                    teamRepo.save(team);
                    count++;
                }
            }
            return "Aggiornamento completato. Aggiornati " + count + " team.";
        }catch(Exception e){
            return "Errore durante l'aggiornamento: " + e.getMessage();
        }
    }
}
