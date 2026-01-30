package com.delmonte.serie_a.controller;

import java.util.List;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
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
    @GetMapping("/update")
    public String updateFromApi() {
        return footballDataService.updateStandings();
    }

    @GetMapping("/matches")
    public String getMatches() {
        return footballDataService.getMatches();
    }
}
