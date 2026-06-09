package com.mindspire.service;

import com.mindspire.config.JwtTokenProvider;
import com.mindspire.dto.AuthResponse;
import com.mindspire.dto.LoginRequest;
import com.mindspire.dto.RegisterRequest;
import com.mindspire.entity.AnonymousProfile;
import com.mindspire.entity.Institution;
import com.mindspire.entity.InstitutionDomain;
import com.mindspire.entity.User;
import com.mindspire.repository.AnonymousProfileRepository;
import com.mindspire.repository.InstitutionDomainRepository;
import com.mindspire.repository.InstitutionRepository;
import com.mindspire.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final InstitutionRepository institutionRepository;
    private final InstitutionDomainRepository institutionDomainRepository;
    private final AnonymousProfileRepository anonymousProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    private static final String[] ANONYMOUS_ADJECTIVES = {"Calm", "Gentle", "Mindful", "Resilient", "Serene", "Hopeful", "Sage", "Kind"};
    private static final String[] ANONYMOUS_NOUNS = {"Panda", "Lotus", "Sparrow", "Oak", "River", "Breeze", "Deer", "Pebble"};

    private String generateUniquePseudonym(UUID institutionId) {
        Random rand = new Random();
        String pseudo;
        do {
            String adj = ANONYMOUS_ADJECTIVES[rand.nextInt(ANONYMOUS_ADJECTIVES.length)];
            String noun = ANONYMOUS_NOUNS[rand.nextInt(ANONYMOUS_NOUNS.length)];
            int suffix = rand.nextInt(900) + 100;
            pseudo = adj + " " + noun + " " + suffix;
        } while (anonymousProfileRepository.findByPseudonym(pseudo).isPresent());
        return pseudo;
    }

    /**
     * Resolves and authenticates user login request.
     */
    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password."));

        // 1. Account Lockout Validation (5 failed attempts, 15-minute lock)
        if (user.getLockoutUntil() != null && user.getLockoutUntil().isAfter(OffsetDateTime.now())) {
            throw new IllegalStateException("Account is temporarily locked. Please try again after 15 minutes.");
        }

        // 2. Verify Password
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            int attempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(attempts);
            
            if (attempts >= 5) {
                user.setLockoutUntil(OffsetDateTime.now().plusMinutes(15));
                userRepository.save(user);
                throw new IllegalStateException("Account has been temporarily locked due to 5 failed login attempts. Please try again after 15 minutes.");
            }
            
            userRepository.save(user);
            throw new IllegalArgumentException("Invalid email or password.");
        }

        // 3. Clear Lockout Info on success
        user.setFailedLoginAttempts(0);
        user.setLockoutUntil(null);
        userRepository.save(user);

        // 4. Check approval details (Counselor, admin, etc.)
        if (!user.isApproved() && !"student".equals(user.getRole())) {
            return AuthResponse.builder()
                    .id(user.getId())
                    .email(user.getEmail())
                    .role(user.getRole())
                    .institutionId(user.getInstitutionId())
                    .requiresApproval(true)
                    .message("Verification pending approval by institution administrator.")
                    .build();
        }

        Institution inst = institutionRepository.findById(user.getInstitutionId())
                .orElseThrow(() -> new NoSuchElementException("User institution registry not found."));

        // 5. Generate secure JWT token
        String jwtToken = tokenProvider.generateToken(user.getEmail(), user.getRole(), user.getInstitutionId());

        return AuthResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .institutionId(user.getInstitutionId())
                .subdomain(inst.getSubdomain())
                .message(jwtToken) // return token inside message string temporarily for controller extraction
                .requiresApproval(false)
                .build();
    }

    /**
     * Handles student signup.
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // Enforce student role restriction: Student is the only self-registerable role.
        if (request.getRole() != null && !request.getRole().equalsIgnoreCase("student")) {
            throw new IllegalArgumentException("Self-registration is restricted to Student profiles only. Other roles must be created by administrators.");
        }

        // Check if user already exists
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException("An account with this email address is already registered.");
        }

        // Resolve Institution by Subdomain
        Institution inst = institutionRepository.findBySubdomain(request.getInstitutionSubdomain())
                .orElseThrow(() -> new IllegalArgumentException("Institution subdomain not resolved."));

        // Validate Institutional Email Domain
        String domain = request.getEmail().substring(request.getEmail().indexOf("@") + 1);
        Optional<InstitutionDomain> allowedDomain = institutionDomainRepository.findByInstitutionIdAndDomain(inst.getId(), domain);
        if (allowedDomain.isEmpty()) {
            throw new IllegalArgumentException("This email domain is not authorized for registration at " + inst.getName() + ".");
        }

        // Create user entity
        UUID newUserId = UUID.randomUUID();
        String uniquePseudo = generateUniquePseudonym(inst.getId());

        User user = User.builder()
                .id(newUserId)
                .institutionId(inst.getId())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role("student")
                .realFirstName(request.getRealFirstName())
                .realLastName(request.getRealLastName())
                .isApproved(true) // Students are auto-approved
                .failedLoginAttempts(0)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();

        userRepository.save(user);

        // Seed Anonymous Profile for discussion boards
        AnonymousProfile anonProfile = AnonymousProfile.builder()
                .userId(newUserId)
                .institutionId(inst.getId())
                .pseudonym(uniquePseudo)
                .helpfulScore(0)
                .reportCount(0)
                .positiveContributions(0)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();

        anonymousProfileRepository.save(anonProfile);

        // Generate JWT
        String jwtToken = tokenProvider.generateToken(user.getEmail(), user.getRole(), user.getInstitutionId());

        return AuthResponse.builder()
                .id(newUserId)
                .email(user.getEmail())
                .role(user.getRole())
                .institutionId(user.getInstitutionId())
                .subdomain(inst.getSubdomain())
                .message(jwtToken)
                .requiresApproval(false)
                .build();
    }

    public String getBrandingConfig(String email, String subdomain) {
        if (email != null && !email.equals("anonymousUser") && !email.trim().isEmpty()) {
            Optional<User> user = userRepository.findByEmail(email);
            if (user.isPresent()) {
                Optional<Institution> inst = institutionRepository.findById(user.get().getInstitutionId());
                if (inst.isPresent()) {
                    return inst.get().getBrandingConfig();
                }
            }
        }
        if (subdomain != null && !subdomain.trim().isEmpty()) {
            Optional<Institution> inst = institutionRepository.findBySubdomain(subdomain);
            if (inst.isPresent()) {
                return inst.get().getBrandingConfig();
            }
        }
        java.util.List<Institution> all = institutionRepository.findAll();
        if (!all.isEmpty()) {
            return all.get(0).getBrandingConfig();
        }
        return "{}";
    }
}
