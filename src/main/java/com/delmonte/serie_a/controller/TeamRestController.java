package com.delmonte.serie_a.controller;

import java.util.List;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

import com.delmonte.serie_a.models.Team;
import com.delmonte.serie_a.service.FootballDataService;
import com.delmonte.serie_a.service.TeamService;

@RestController
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
@RequestMapping("/api/teams")
public class TeamRestController {

    @Autowired
    private TeamService teamService;
    @Autowired
    private FootballDataService footballDataService;

/**
 * Retrieves all teams in the database.
 * @return a list of all teams in the database.
 */
    @GetMapping
    public List<Team> getAllTeams() {
        return teamService.getAll();
    }

    /**
     * Retrieves the standings of the Serie A championship from the Football Data API
     * @return a JSON string containing the standings of the Serie A championship
     */
    @GetMapping("/standings")
    public String getStandings() {
        return footballDataService.getStandings();
    }
    /**
     * Retrieves the updated Standing of the Serie A championship from the Football Data API.
     * The updated Standing is retrieved from the API and saved in the database.
     * @return a JSON string containing the updated Standing of the Serie A championship
     */
    @GetMapping("/update")
    public String updateFromApi() {
        return footballDataService.updateStandings();
    }

/**
 * Retrieves the synchronization status of the Serie A championship.
 * @return true if the synchronization status is successful, false otherwise.
 */
    @GetMapping("/sync-status")
    public boolean getSyncStatus() {
        return footballDataService.checkSyncStatus();
    }

    /**
     * Retrieves all matches of the Serie A championship from the Football Data API
     * @param season optional season year
     * @return a JSON string containing matches
     */
    @GetMapping("/matches")
    public String getMatches(@org.springframework.web.bind.annotation.RequestParam(required = false) Integer season) {
        return footballDataService.getMatches(season);
    }

    /**
     * Retrieves the scorers of the Serie A championship from the Football Data API
     * @return a JSON string containing the scorers of the Serie A championship
     */
    @GetMapping("/scorers")
    public String getScorers() {
        return footballDataService.getScorers();
    }
    /**
     * Retrieves the details of a match from the Football Data API
     * @param matchId the ID of the match to retrieve
     * @return a JSON string containing the details of the match
     */
    @GetMapping("/matches/{matchId}")
    public String getMatchDetails(@PathVariable int matchId) {
        return footballDataService.getMatchDetails(matchId);
    }

    @GetMapping("/debug/leagues")
    public String getAllLeagues() {
        return footballDataService.getAllLeagues();
    }

    @GetMapping("/matches/external/{externalId}")
    public String getExternalMatchDetails(@PathVariable String externalId) {
        return footballDataService.getExternalMatchDetails(externalId);
    }

    @GetMapping("/matches/stats/{eventId}")
    public String getMatchStatistics(@PathVariable String eventId) {
        return footballDataService.getMatchStatistics(eventId);
    }
}
