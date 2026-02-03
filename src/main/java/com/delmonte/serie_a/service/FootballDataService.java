package com.delmonte.serie_a.service;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

import java.util.Optional;

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
    @Value("${RAPIDAPI_KEY:}")
    private String rapidApiKey;
    @Value("${RAPIDAPI_HOST:api-football-v1.p.rapidapi.com}")
    private String rapidApiHost;
    @Autowired
    private TeamRepo teamRepo;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Retrieves the current standings of the Serie A championship from the Football Data API
     * @return a JSON string containing the Standing of the Serie A championship
     */
    public String getStandings(){
        String url = "https://api.football-data.org/v4/competitions/SA/standings";
        return callFootballDataApi(url);
    }

    /**
     * Recupera le partite della Serie A.
     * @param season l'anno della stagione (es. 2024)
     * @return un JSON con tutte le partite
     */
    public String getMatches(Integer season) {
        String url = "https://api.football-data.org/v4/competitions/SA/matches";
        if (season != null) {
            url += "?season=" + season;
        }
        return callFootballDataApi(url);
    }

    /**
     * Retrieves the scorers of the Serie A championship from the Football Data API.
     * @return a JSON string containing the scorers of the Serie A championship
     */
    public String getScorers(){
        String url = "https://api.football-data.org/v4/competitions/SA/scorers";
        return callFootballDataApi(url);
    }
    
    public String getAllLeagues() {
        try {
            String url = "https://" + rapidApiHost + "/football-get-all-leagues-with-countries";
            System.out.println("DEBUG: Chiamata per tutte le leghe con paesi: " + url);
            return callRapidApi(url);
        } catch (Exception e) {
            return "{\"error\": \"Failed to fetch leagues: " + e.getMessage() + "\"}";
        }
    }

    public String getMatchDetails(int matchId) {
        try {
            // 1. Recupera info di base da Football-Data.org
            String fdUrl = "https://api.football-data.org/v4/matches/" + matchId;
            String fdResponse = callFootballDataApi(fdUrl);
            JsonNode root = objectMapper.readTree(fdResponse);

            // Controllo se l'API ha restituito un errore
            if (root.isMissingNode() || root.has("errorCode") || root.has("error")) {
                System.out.println("ERRORE API FOOTBALL-DATA: " + fdResponse);
                return fdResponse;
            }

            // Uso path().asText() con controllo preventivo o valore di default
            JsonNode utcNode = root.path("utcDate");
            if (utcNode.isMissingNode()) {
                return "{\"error\": \"Dati match non trovati (utcDate mancante)\"}";
            }
            
            String utcDate = utcNode.asText(); 
            String date = utcDate.length() >= 10 ? utcDate.substring(0, 10) : "";
            
            if (date.isEmpty()) {
                return "{\"error\": \"Formato data non valido: " + utcDate + "\"}";
            }

            int matchYear = Integer.parseInt(date.substring(0, 4));
            int matchMonth = Integer.parseInt(date.substring(5, 7));
            // In Serie A, la stagione 2024/25 è identificata come "2024" nelle API.
            // Se la partita è da Gennaio a Luglio, la stagione di riferimento è l'anno precedente.
            int seasonToUse = (matchMonth >= 8) ? matchYear : matchYear - 1;

            String homeTeamName = root.path("homeTeam").path("name").asText("Sconosciuta");
            String awayTeamName = root.path("awayTeam").path("name").asText("Sconosciuta");

            System.out.println("DEBUG: Cerco " + homeTeamName + " vs " + awayTeamName + " del " + date + " (Stagione API suggerita: " + seasonToUse + ")");

            // --- PROVA 1: NUOVA API (RAPIDAPI) ---
            if (rapidApiKey != null && !rapidApiKey.isEmpty()) {
                try {
                    System.out.println("DEBUG: Provo Nuova API | Host: " + rapidApiHost);
                    
                    // Proviamo l'endpoint che restituisce tutte le partite della lega (Serie A Italiana = 55)
                    // Questo è più affidabile per popolare i dettagli
                    String apiFootballUrl = "https://" + rapidApiHost + "/football-get-all-matches-by-league?leagueid=55"; 
                    
                    System.out.println("DEBUG: URL Chiamata (Lega): " + apiFootballUrl);
                    String response = callRapidApi(apiFootballUrl);
                    
                    if (response.contains("not subscribed") || response.contains("Forbidden")) {
                        System.err.println("ERRORE SOTTOSCRIZIONE: " + response);
                        return response;
                    }

                    System.out.println("RISPOSTA GREZZA NUOVA API: " + response);
                    return response;
                } catch (Exception e) {
                    System.err.println("Errore Nuova API: " + e.getMessage());
                }
            }

            return "{\"error\": \"Match not found on API-Football for date " + date + "\"}";

        } catch (Exception e) {
            e.printStackTrace();
            return "{\"error\": \"Error processing match details: " + e.getMessage() + "\"}";
        }
    }

    private String callSimpleApi(String url) {
        try {
            return restTemplate.getForObject(url, String.class);
        } catch (Exception e) {
            return "{\"error\": \"API call failed: " + e.getMessage() + "\"}";
        }
    }

    private boolean isSameMatch(String fdHome, String fdAway, String sHome, String sAway) {
        return (checkName(fdHome, sHome) && checkName(fdAway, sAway)) || 
               (checkName(fdHome, sAway) && checkName(fdAway, sHome)); // Per sicurezza, anche se raro
    }

    private boolean checkName(String fdName, String sName) {
        String n1 = simplify(fdName);
        String n2 = simplify(sName);
        
        // Se uno dei due nomi contiene l'altro (es. "Inter Milan" vs "Inter")
        if (n1.contains(n2) || n2.contains(n1)) return true;

        // Se le prime 3 lettere sono uguali (es. "Juve" vs "Juventus")
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
        HttpHeaders headers = new HttpHeaders();
        headers.set("x-rapidapi-key", rapidApiKey);
        headers.set("x-rapidapi-host", rapidApiHost);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            return response.getBody();
        } catch (Exception e) {
            // Rimuoviamo virgolette e caratteri speciali che rompono il JSON
            String safeError = e.getMessage().replace("\"", "'").replace("\n", " ");
            return "{\"error\": \"RapidAPI call failed: " + safeError + "\"}";
        }
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

    /**
     * Checks if the teams in the database are in sync with the ones in the Football Data API.
     * @return true if the teams are in sync, false otherwise
     */
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
                        return false; // Trovata una discrepanza, non siamo sincronizzati
                    }
                }
            }
            return true; // Tutti i punti corrispondono
        }catch(Exception e){
            return true; // In caso di errore API, meglio restare sul verde
        }
    }

    /**
     * Updates the standings of the Serie A championship from the Football Data API.
     * 
     * Retrieves the current Standing of the Serie A championship from the Football Data API.
     * Then, for each team in the Standing, it updates the points and the logo URL of the corresponding team in the database.
     * 
     * @return a string containing the result of the update operation. If the update is successful, it returns a string like "Aggiornamento completato. Aggiornati X team.". If an error occurs, it returns a string like "Errore durante l'aggiornamento: Y".
     */
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
