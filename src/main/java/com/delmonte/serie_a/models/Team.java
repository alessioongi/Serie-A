package com.delmonte.serie_a.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "teams")
@Data
public class Team {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Column(name = "name")
    private String name;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "city")
    private String city;

    @Column(name = "stadium_name")
    private String stadiumName;

    @Column(name = "capacity")
    private int stadiumCapacity;

    @Column(name = "logo_url",columnDefinition = "TEXT")
    private String logoUrl;

    @Column(name = "stadium_url",columnDefinition = "TEXT")
    private String stadiumUrl;

    @Column(name = "primary_color")
    private String primaryColor;

    @Column(name = "secondary_color")
    private String secondaryColor;

    @Column(columnDefinition = "TEXT")
    private String history;

    @Column(name = "founded_year")
    private int foundedYear;

    @Column(name = "website_url",columnDefinition = "TEXT")
    private String websiteUrl;

    @Column(name = "points")
    private int points=0;
}
